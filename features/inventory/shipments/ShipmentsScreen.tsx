"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { AmazonOption, InboundShipment, LabelType, Marketplace, PackingSubmission, ShipmentStatus } from './types'
import { CarrierEntry, CreateShipmentInput, OptionKind, RewindTarget, ShipFromRequest, ShipmentsMode, useShipments } from './useShipments'
import {
  MARKETPLACE_META,
  NEXT_ACTION,
  NextAction,
  STATUS_META,
  getReceivedUnits,
  getShipmentUnits,
  getUnassignedUnits,
} from './workflow'
import { ShipmentRow, SHIPMENT_TABLE_COLUMNS } from './ShipmentRow'
import { CreateMode, CreateShipmentDrawer } from './CreateShipmentDrawer'
import { ConfirmModal, MarkShippedModal, OptionPickerModal } from './ShipmentDialogs'
import { PackingModal } from './PackingModal'
import { CarrierModal } from './CarrierModal'
import { EditShipFromModal } from './EditShipFromModal'
import { formatRelative, formatUnits, unitsLabel } from './ShipmentParts'

type StatusFilter = 'all' | ShipmentStatus

/** At most one dialog is open at a time. */
type Dialog =
  | { type: 'create'; preselect: string[] }
  | { type: 'options'; id: string; kind: OptionKind }
  | { type: 'packing'; id: string }
  | { type: 'carrier'; id: string }
  | { type: 'ship'; id: string }
  | { type: 'cancel'; id: string }
  /** Edit the ship-from address of a shipment that already has an Amazon plan. */
  | { type: 'shipFrom'; id: string }
  /** Confirm going back; cancelling returns to the dialog it came from. */
  | { type: 'rewind'; id: string; to: RewindTarget; resume: Dialog }
  | null

const STATUS_ORDER: ShipmentStatus[] = ['in_progress', 'shipped', 'receiving', 'closed', 'cancelled']

const ACTION_TO_OPTION: Partial<Record<NextAction, OptionKind>> = {
  choose_placement: 'placement',
  choose_window: 'window',
}

/** What the seller redoes when going back to each target. */
const REWIND_LABEL: Record<RewindTarget, string> = {
  packing: 'box contents',
  placement: 'the destination warehouse',
  window: 'the delivery window',
  carrier: 'the carrier',
}

const LABEL_NAMES: Record<LabelType, string> = {
  box: 'Box labels',
  pallet: 'Pallet labels',
  unit: 'FNSKU unit labels',
}

export const ShipmentsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const {
    shipments,
    pool,
    mode,
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getPackingPlan,
    submitPacking,
    getOptions,
    confirmOptions,
    submitCarrier,
    rewind,
    generateLabels,
    downloadLabels,
    setShipFrom,
    getShipRequirements,
    markShipped,
    cancelShipment,
    sync,
  } = useShipments()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ---- Filters ----
  const [filters, setFilters] = useState<{ search: string; status: StatusFilter; marketplace: 'all' | Marketplace }>({
    search: '',
    status: 'all',
    marketplace: 'all',
  })
  const { search, status: statusFilter, marketplace: marketplaceFilter } = filters
  const setFilter = (next: Partial<typeof filters>) => setFilters((prev) => ({ ...prev, ...next }))
  const debouncedSearch = useDebounce(search, 250)

  // ---- Expansion ----
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- Dialogs ----
  const [ui, setUi] = useState<{
    dialog: Dialog
    isSyncing: boolean
    /** Label downloads in progress, keyed "shipmentId:type"; survives closing the dialog. */
    downloading: Record<string, true>
  }>({ dialog: null, isSyncing: false, downloading: {} })
  const { dialog, isSyncing, downloading } = ui
  const openDialog = (next: Dialog) => setUi((prev) => ({ ...prev, dialog: next }))
  const closeDialog = useCallback(() => setUi((prev) => ({ ...prev, dialog: null })), [])
  /**
   * Closes the dialog only if it's still the one asking. When a step succeeds
   * the next step's dialog is already open, and the finished one's onClose
   * must not shut it.
   */
  const closeIfCurrent = (current: Dialog) => () =>
    setUi((prev) => (JSON.stringify(prev.dialog) === JSON.stringify(current) ? { ...prev, dialog: null } : prev))
  /** Like closeIfCurrent, but cancelling drops back to the dialog the user came from. */
  const closeTo = (current: Dialog, resume: Dialog) => () =>
    setUi((prev) => (JSON.stringify(prev.dialog) === JSON.stringify(current) ? { ...prev, dialog: resume } : prev))
  const dialogId = (type: 'options' | 'packing' | 'carrier' | 'ship' | 'cancel' | 'shipFrom') =>
    dialog && dialog.type === type ? dialog.id : null

  // Deep link from Planner: /shipments?create=1&productIds=1,2,3
  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    openDialog({ type: 'create', preselect: (searchParams.get('productIds') ?? '').split(',').filter(Boolean) })
    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  // ---- Derived ----
  const unassigned = useMemo(() => getUnassignedUnits(pool, shipments), [pool, shipments])

  // Amazon is also polled in the background, so the latest of that and our own sync is what "synced" means
  const lastSynced = useMemo(
    () => shipments.reduce((latest, s) => (s.syncedAt && s.syncedAt > latest ? s.syncedAt : latest), lastSyncedAt),
    [shipments, lastSyncedAt]
  )

  const summary = useMemo(() => {
    const by = (st: ShipmentStatus) => shipments.filter((s) => s.status === st)
    const sumUnits = (list: typeof shipments) => list.reduce((n, s) => n + getShipmentUnits(s), 0)
    const inProgress = by('in_progress')
    const shipped = by('shipped')
    const receiving = by('receiving')
    const receivingUnits = sumUnits(receiving)
    const receivedUnits = receiving.reduce((n, s) => n + getReceivedUnits(s), 0)
    const unassignedSkus = Object.values(unassigned).filter((u) => u > 0).length
    return {
      unassignedUnits: Object.values(unassigned).reduce((a, b) => a + b, 0),
      unassignedSkus,
      reservedUnits: pool.reduce((a, p) => a + p.reserved, 0),
      inProgressCount: inProgress.length,
      inProgressUnits: sumUnits(inProgress),
      draftCount: inProgress.filter((s) => s.stage === 'draft').length,
      shippedCount: shipped.length,
      shippedUnits: sumUnits(shipped),
      receivingCount: receiving.length,
      receivingUnits,
      receivedPct: receivingUnits ? Math.round((receivedUnits / receivingUnits) * 100) : 0,
    }
  }, [shipments, unassigned, pool])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: shipments.length,
      in_progress: 0,
      shipped: 0,
      receiving: 0,
      closed: 0,
      cancelled: 0,
    }
    shipments.forEach((s) => counts[s.status]++)
    return counts
  }, [shipments])

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return shipments
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .filter((s) => marketplaceFilter === 'all' || s.marketplace === marketplaceFilter)
      .filter(
        (s) =>
          !q ||
          s.reference.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.legs.some(
            (l) =>
              l.amazonShipmentId?.toLowerCase().includes(q) ||
              l.shipmentConfirmationId?.toLowerCase().includes(q) ||
              l.fulfillmentCenter.toLowerCase().includes(q)
          ) ||
          s.items.some(
            (i) =>
              i.sku.toLowerCase().includes(q) ||
              i.asin.toLowerCase().includes(q) ||
              i.title.toLowerCase().includes(q)
          )
      )
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          b.updatedAt.localeCompare(a.updatedAt)
      )
  }, [shipments, statusFilter, marketplaceFilter, debouncedSearch])

  const byId = (id: string | null) => (id ? shipments.find((s) => s.id === id) ?? null : null)

  // ---- Handlers ----
  /** Runs an action with a success toast; failures toast the server's message (Amazon's own text when it has one). */
  const run = async (fn: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await fn()
      dispatch(addNotification({ message: success, type: 'success' }))
    } catch (err) {
      console.error(err)
      dispatch(addNotification({ message: (err as Error).message || failure, type: 'error' }))
      throw err
    }
  }

  /** Same as run, for fire-and-forget buttons: the toast is the whole error handling. */
  const attempt = (fn: () => Promise<unknown>, success: string, failure: string) =>
    run(fn, success, failure).catch(() => undefined)

  /**
   * Guided flow: once a step succeeds, open the next one. Labels need no input,
   * so they're generated on the way to "Mark as shipped". Closing a dialog just
   * pauses; the row's next-step button resumes from the same place.
   */
  const continueFlow = async (shipment: InboundShipment): Promise<void> => {
    if (shipment.status !== 'in_progress') return closeDialog()
    const { action } = NEXT_ACTION[shipment.stage]
    const kind = ACTION_TO_OPTION[action]
    if (kind) return openDialog({ type: 'options', id: shipment.id, kind })
    if (action === 'set_packing') return openDialog({ type: 'packing', id: shipment.id })
    if (action === 'enter_carrier') return openDialog({ type: 'carrier', id: shipment.id })
    if (action === 'mark_shipped') return openDialog({ type: 'ship', id: shipment.id })
    if (action === 'generate_labels') {
      closeDialog()
      try {
        const ready = await generateLabels(shipment.id)
        dispatch(addNotification({ message: `Labels generated for ${shipment.reference}`, type: 'success' }))
        return continueFlow(ready)
      } catch (err) {
        dispatch(addNotification({ message: (err as Error).message || 'Could not generate labels.', type: 'error' }))
        return
      }
    }
    closeDialog()
  }

  const handleAction = async (id: string, action: NextAction) => {
    const shipment = byId(id)
    if (!shipment) return
    const optionKind = ACTION_TO_OPTION[action]
    if (optionKind) return openDialog({ type: 'options', id, kind: optionKind })
    if (action === 'set_packing') return openDialog({ type: 'packing', id })
    if (action === 'enter_carrier') return openDialog({ type: 'carrier', id })
    if (action === 'mark_shipped') return openDialog({ type: 'ship', id })
    if (action === 'generate_labels') return continueFlow(shipment)
    if (action === 'submit_plan') {
      try {
        const planned = await submitPlan(id)
        dispatch(addNotification({ message: `${shipment.reference} sent to Amazon. Inbound plan created.`, type: 'success' }))
        return continueFlow(planned)
      } catch (err) {
        dispatch(addNotification({ message: (err as Error).message || 'Amazon rejected the inbound plan.', type: 'error' }))
      }
    }
  }

  // The picker shows its own error and stays open, so only success is toasted here
  const handleConfirmOptions = async (chosen: AmazonOption[]) => {
    if (dialog?.type !== 'options') return
    const { id, kind } = dialog
    const copy: Record<OptionKind, string> = {
      placement: 'Warehouse confirmed',
      window: chosen.length ? 'Delivery window booked' : 'No delivery window needed',
    }
    const updated = await confirmOptions(id, kind, chosen)
    dispatch(addNotification({ message: `${updated.reference}: ${copy[kind]}`, type: 'success' }))
    await continueFlow(updated)
  }

  const handleSubmitCarrier = async (id: string, carriers: CarrierEntry[], readyToShipDate?: string) => {
    const updated = await submitCarrier(id, carriers, readyToShipDate)
    dispatch(addNotification({ message: `${updated.reference}: carrier saved and Amazon updated`, type: 'success' }))
    await continueFlow(updated)
  }

  /** Redoes an earlier step, then reopens the dialog for wherever the shipment landed. */
  const performRewind = async (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) => {
    const { shipment, notice } = await rewind(id, to, shipFrom)
    dispatch(addNotification({ message: `${shipment.reference}: back to ${REWIND_LABEL[to]}`, type: 'success' }))
    if (notice) dispatch(addNotification({ message: notice, type: 'warning' }))
    await continueFlow(shipment)
  }

  /** Steps that only change our own record go back straight away; the rest recreate the Amazon plan, so they ask first. */
  const handleBack = (id: string, to: RewindTarget) => {
    if (to === 'carrier') {
      performRewind(id, to).catch((err: Error) =>
        dispatch(addNotification({ message: err.message || 'Could not go back', type: 'error' }))
      )
      return
    }
    openDialog({ type: 'rewind', id, to, resume: dialog })
  }

  const handleSubmitPacking = async (id: string, submission: PackingSubmission) => {
    const updated = await submitPacking(id, submission)
    dispatch(addNotification({ message: `${updated.reference}: box contents sent to Amazon`, type: 'success' }))
    await continueFlow(updated)
  }

  const setDownloading = (key: string, on: boolean) =>
    setUi((prev) => {
      const next = { ...prev.downloading }
      if (on) next[key] = true
      else delete next[key]
      return { ...prev, downloading: next }
    })

  /** Downloads the server's copy of the labels in the background; one request per shipment and type at a time. */
  const handleDownloadLabel = async (id: string, type: LabelType) => {
    const key = `${id}:${type}`
    if (downloading[key]) return
    const shipment = byId(id)
    setDownloading(key, true)
    try {
      const file = await downloadLabels(id, type)
      const ext = file.type === 'application/zip' ? 'zip' : 'pdf'
      saveFile(file, `${shipment?.reference ?? 'shipment'}-${LABEL_NAMES[type].toLowerCase().replace(/s+/g, '-')}.${ext}`)
    } catch (err) {
      dispatch(addNotification({ message: (err as Error).message || `Could not download ${LABEL_NAMES[type].toLowerCase()}`, type: 'error' }))
    } finally {
      setDownloading(key, false)
    }
  }

  const downloadingFor = (id: string): Partial<Record<LabelType, boolean>> =>
    Object.fromEntries((['box', 'unit', 'pallet'] as LabelType[]).map((t) => [t, !!downloading[`${id}:${t}`]]))

  const handleSync = async () => {
    setUi((prev) => ({ ...prev, isSyncing: true }))
    await attempt(sync, 'Shipment statuses synced from Amazon', 'Sync failed')
    setUi((prev) => ({ ...prev, isSyncing: false }))
  }

  const openCreate = () => openDialog({ type: 'create', preselect: [] })

  /** Save draft holds the units; Confirm with Amazon also creates the inbound plan. */
  const handleCreate = async (input: CreateShipmentInput, createMode: CreateMode) => {
    let created
    try {
      created = await createShipment(input)
    } catch (err) {
      dispatch(addNotification({ message: (err as Error).message || 'Could not create the shipment', type: 'error' }))
      throw err
    }
    setFilter({ status: 'all' })
    setExpanded((prev) => new Set(prev).add(created.id))
    if (createMode === 'draft') {
      dispatch(addNotification({ message: `${created.reference} saved as a draft`, type: 'success' }))
      return created
    }
    // The shipment exists either way; a rejected plan leaves it as a draft to retry from the row
    try {
      const confirmed = await submitPlan(created.id)
      dispatch(addNotification({ message: `${created.reference} sent to Amazon. Inbound plan created.`, type: 'success' }))
      return confirmed
    } catch (err) {
      dispatch(addNotification({ message: `${created.reference} saved as a draft, but Amazon rejected the plan: ${(err as Error).message}`, type: 'error' }))
      return created
    }
  }

  const cancelTarget = byId(dialogId('cancel'))
  const shippingTarget = byId(dialogId('ship'))

  return (
    <Container size="full" className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            Split your FBA reserved stock into Amazon inbound shipments and track them to receipt.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Synced {formatRelative(lastSynced)}</span>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> Syncing…</span>
            ) : (
              'Sync from Amazon'
            )}
          </Button>
          <Button onClick={openCreate} disabled={summary.unassignedUnits === 0}>
            + New shipment
          </Button>
        </div>
      </div>

      <ModeBanner mode={mode} />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard accent="border-t-secondary-800" title="Unassigned FBA reserve">
          <Metric value={formatUnits(summary.unassignedUnits)} unit="units" />
          <p className="mt-1 text-xs text-text-muted">
            {summary.unassignedSkus} SKU{summary.unassignedSkus !== 1 && 's'} ·{' '}
            {formatUnits(summary.reservedUnits)} reserved in total
          </p>
        </SummaryCard>
        <SummaryCard accent="border-t-warning-500" title="In progress">
          <Metric value={String(summary.inProgressCount)} unit={`shipments · ${formatUnits(summary.inProgressUnits)} units`} />
          <p className="mt-1 text-xs text-text-muted">
            {summary.draftCount} draft{summary.draftCount !== 1 && 's'} not sent to Amazon yet
          </p>
        </SummaryCard>
        <SummaryCard accent="border-t-blue-500" title="Shipped">
          <Metric value={String(summary.shippedCount)} unit={`shipments · ${formatUnits(summary.shippedUnits)} units`} />
          <p className="mt-1 text-xs text-text-muted">On the way to Amazon</p>
        </SummaryCard>
        <SummaryCard accent="border-t-violet-500" title="Receiving">
          <Metric value={`${summary.receivedPct}%`} unit={`of ${formatUnits(summary.receivingUnits)} units`} />
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary-100">
            <div className="h-full bg-violet-500" style={{ width: `${summary.receivedPct}%` }} />
          </div>
        </SummaryCard>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1" role="tablist">
          {(['all', ...STATUS_ORDER] as StatusFilter[]).map((st) => {
            const active = statusFilter === st
            return (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter({ status: st })}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-secondary-800 text-white' : 'text-text-muted hover:bg-secondary-50 hover:text-text-primary'
                )}
              >
                {st === 'all' ? 'All' : STATUS_META[st].label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px]',
                    active ? 'bg-white/20' : 'bg-secondary-100 text-text-muted'
                  )}
                >
                  {statusCounts[st]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative min-w-0 flex-1 basis-full sm:min-w-[240px] sm:basis-auto">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search shipment ID, FBA ID, FC, SKU or product"
            value={search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
          />
        </div>

        <select
          value={marketplaceFilter}
          onChange={(e) => setFilter({ marketplace: e.target.value as 'all' | Marketplace })}
          aria-label="Marketplace"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
        >
          <option value="all">All marketplaces</option>
          {(Object.keys(MARKETPLACE_META) as Marketplace[]).map((mp) => (
            <option key={mp} value={mp}>
              {MARKETPLACE_META[mp].flag} {mp}
            </option>
          ))}
        </select>

        {expanded.size > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
            Collapse all
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Shipment</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">SKUs</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Delivery window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={SHIPMENT_TABLE_COLUMNS} className="py-14 text-center">
                    {shipments.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">
                          No shipments yet. Allocate stock to FBA in the Planner, then split it into shipments here.
                        </p>
                        <Button onClick={openCreate} disabled={summary.unassignedUnits === 0}>
                          + New shipment
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">No shipments match these filters.</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((s) => (
                  <ShipmentRow
                    key={s.id}
                    shipment={s}
                    isExpanded={expanded.has(s.id)}
                    onToggle={() => toggle(s.id)}
                    pool={pool}
                    availableElsewhere={getUnassignedUnits(pool, shipments, s.id)}
                    onChangeShipFrom={(choice) => run(() => setShipFrom(s.id, choice), `${s.reference} will ship from the new address`, 'Could not change the ship-from address')}
                    onSaveItems={(items) =>
                      run(
                        () => saveItems(s.id, items),
                        s.stage === 'plan_created'
                          ? `${s.reference} updated. The Amazon plan was cancelled; send it to Amazon again.`
                          : `${s.reference} quantities saved`,
                        'Could not save quantities'
                      )
                    }
                    onAction={(action) => handleAction(s.id, action)}
                    onCancel={() => openDialog({ type: 'cancel', id: s.id })}
                    onDownloadLabel={(type) => handleDownloadLabel(s.id, type)}
                    downloadingLabels={downloadingFor(s.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drawers & dialogs */}
      <CreateShipmentDrawer
        isOpen={dialog?.type === 'create'}
        onClose={closeIfCurrent(dialog?.type === 'create' ? dialog : null)}
        pool={pool}
        shipments={shipments}
        unassigned={unassigned}
        initialProductIds={dialog?.type === 'create' ? dialog.preselect : []}
        onCreate={handleCreate}
      />

      <OptionPickerModal
        kind={dialog?.type === 'options' ? dialog.kind : null}
        shipment={byId(dialogId('options'))}
        loadOptions={getOptions}
        onConfirm={handleConfirmOptions}
        onBack={() => dialog?.type === 'options' && handleBack(dialog.id, dialog.kind === 'placement' ? 'packing' : 'placement')}
        onEditShipFrom={() => dialog?.type === 'options' && openDialog({ type: 'shipFrom', id: dialog.id })}
        onClose={closeIfCurrent(dialog?.type === 'options' ? dialog : null)}
      />

      <CarrierModal
        shipment={byId(dialogId('carrier'))}
        onConfirm={(carriers, readyToShipDate) => handleSubmitCarrier(dialogId('carrier')!, carriers, readyToShipDate)}
        onBack={() => dialog?.type === 'carrier' && handleBack(dialog.id, 'window')}
        onClose={closeIfCurrent(dialog?.type === 'carrier' ? dialog : null)}
      />

      <EditShipFromModal
        shipment={byId(dialogId('shipFrom'))}
        onConfirm={(choice) => performRewind(dialogId('shipFrom')!, 'placement', choice)}
        onClose={closeTo(
          dialog?.type === 'shipFrom' ? dialog : null,
          dialog?.type === 'shipFrom' ? { type: 'options', id: dialog.id, kind: 'placement' } : null
        )}
      />

      <PackingModal
        shipment={byId(dialogId('packing'))}
        loadPlan={getPackingPlan}
        onSubmit={handleSubmitPacking}
        onClose={closeIfCurrent(dialog?.type === 'packing' ? dialog : null)}
      />

      <MarkShippedModal
        shipment={shippingTarget}
        onDownloadLabel={(type) => shippingTarget && handleDownloadLabel(shippingTarget.id, type)}
        downloadingLabels={shippingTarget ? downloadingFor(shippingTarget.id) : {}}
        onBack={() => shippingTarget && handleBack(shippingTarget.id, 'carrier')}
        onClose={closeDialog}
        loadRequirements={getShipRequirements}
        onConfirm={(tracking) => {
          const s = shippingTarget
          return run(
            () => markShipped(s!.id, tracking),
            `${s?.reference} confirmed with Amazon and marked as shipped. ${unitsLabel(s ? getShipmentUnits(s) : 0)} deducted from inventory.`,
            'Could not mark as shipped'
          )
        }}
      />

      <ConfirmModal
        isOpen={dialog?.type === 'rewind'}
        title={`Go back to ${dialog?.type === 'rewind' ? REWIND_LABEL[dialog.to] : ''}?`}
        message="Amazon locks each step once it is confirmed, so going back cancels the inbound plan and creates a new one. Your earlier choices are re-applied automatically where Amazon offers the same options; anything it can't match, you choose again."
        confirmLabel="Go back"
        onClose={closeTo(dialog?.type === 'rewind' ? dialog : null, dialog?.type === 'rewind' ? dialog.resume : null)}
        onConfirm={() => performRewind((dialog as { id: string }).id, (dialog as { to: RewindTarget }).to)}
      />

      <ConfirmModal
        isOpen={!!cancelTarget}
        title={`Cancel ${cancelTarget?.reference ?? ''}?`}
        message={
          <>
            {cancelTarget?.amazonInboundPlanId
              ? 'The inbound plan will be cancelled with Amazon. '
              : 'This draft was never sent to Amazon. '}
            Its {formatUnits(cancelTarget ? getShipmentUnits(cancelTarget) : 0)} units go back to your
            unassigned FBA reserve.
          </>
        }
        confirmLabel="Cancel shipment"
        variant="danger"
        onClose={closeDialog}
        onConfirm={() =>
          run(() => cancelShipment(cancelTarget!.id), `${cancelTarget?.reference} cancelled`, 'Could not cancel shipment')
        }
      />
    </Container>
  )
}

/** Only shown in sandbox mode, so nobody mistakes Amazon's sample data for a real plan. */
const ModeBanner: React.FC<{ mode: ShipmentsMode }> = ({ mode }) =>
  mode === 'sandbox' ? (
    <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
      <strong>Amazon sandbox mode.</strong> Inbound steps go to the SP-API sandbox with sandbox credentials, so nothing
      reaches your Seller Central account. Your shipments and stock are real; Amazon&apos;s side answers with its sample
      data (plan wf1234…, SKU &quot;msku&quot;, FC YYZ5).
    </div>
  ) : null

/** Hands a downloaded file to the browser's own download manager. */
function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const SummaryCard: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({
  title,
  accent,
  children,
}) => (
  <Card className={cn('border-t-4', accent)}>
    <CardContent className="p-5">
      <h3 className="mb-2 text-sm font-medium text-text-muted">{title}</h3>
      {children}
    </CardContent>
  </Card>
)

const Metric: React.FC<{ value: string; unit: string }> = ({ value, unit }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-bold text-text-primary">{value}</span>
    <span className="text-sm text-text-muted">{unit}</span>
  </div>
)
