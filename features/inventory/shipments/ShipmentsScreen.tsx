"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
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
import { AmazonOption, InboundShipment, LabelType, Marketplace, PackingSubmission, ShipmentChannel, ShipmentStatus, WfsCarrierEntry, WfsCartons, legId } from './types'
import { CarrierEntry, ChannelConfig, CreateShipmentInput, OptionKind, RewindTarget, ShipFromRequest, useShipments } from './useShipments'
import {
  MARKETPLACE_META,
  NextAction,
  STATUS_META,
  getReceivedUnits,
  getShipmentUnits,
  getUnassignedUnits,
  nextActionOf,
  ofChannel,
} from './workflow'
import { CHANNEL_ORDER, SHIPMENT_CHANNELS, channelIdOf, channelOf, isShipmentChannel } from './channels'
import { ShipmentRow, SHIPMENT_TABLE_COLUMNS } from './ShipmentRow'
import { CreateMode, CreateShipmentDrawer } from './CreateShipmentDrawer'
import { ConfirmModal, LabelsStepModal, MarkShippedModal, OptionPickerModal } from './ShipmentDialogs'
import { PackingModal } from './PackingModal'
import { CarrierModal } from './CarrierModal'
import { WfsCartonsModal } from './WfsCartonsModal'
import { WfsCarrierModal } from './WfsCarrierModal'
import { LabelFormatProvider, isSizedLabelType, useLabelFormatState } from './labelFormats'
import { EditShipFromModal } from './EditShipFromModal'
import { ChannelChip, FloatingMenu, formatUnits, unitsLabel } from './ShipmentParts'

type StatusFilter = 'all' | ShipmentStatus
type ChannelFilter = 'all' | ShipmentChannel

/** At most one dialog is open at a time. */
type Dialog =
  | { type: 'create'; preselect: string[]; channel?: ShipmentChannel }
  | { type: 'options'; id: string; kind: OptionKind }
  /** Box contents (FBA) or cartons (WFS). */
  | { type: 'packing'; id: string }
  | { type: 'carrier'; id: string }
  /** Labels being generated between the carrier and Mark as shipped; `error` keeps it open with Try again. */
  | { type: 'labels'; id: string; error?: string }
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

const LABEL_NAMES: Record<LabelType, string> = {
  box: 'Box labels',
  pallet: 'Pallet labels',
  unit: 'FNSKU unit labels',
  carton: 'Carton labels',
  carrier: 'Carrier labels',
}

const FILE_EXTENSIONS: Record<string, string> = { 'application/zip': 'zip', 'application/x-zpl': 'zpl' }

/** Only shipments of this channel, or null (keeps FBA-only dialogs away from WFS shipments and back). */
const ofChannelOrNull = (s: InboundShipment | null, channel: ShipmentChannel) => (s && channelIdOf(s) === channel ? s : null)

export const ShipmentsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const {
    shipments,
    pools,
    channels,
    labelFormats: labelFormatCatalog,
    createShipment,
    saveItems,
    submitPlan,
    getPackingPlan,
    submitPacking,
    getOptions,
    confirmOptions,
    submitCarrier,
    submitWfsCartons,
    quoteWfsCarrier,
    submitWfsCarrier,
    rewind,
    generateLabels,
    downloadLabels,
    setShipFrom,
    getShipRequirements,
    markShipped,
    cancelShipment,
  } = useShipments()

  const labelFormats = useLabelFormatState(labelFormatCatalog)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ---- Channel switch (kept in ?channel= so Planner links can land on it) ----
  const urlChannel = searchParams.get('channel')
  const channelFilter: ChannelFilter = isShipmentChannel(urlChannel) ? urlChannel : 'all'
  const setChannelFilter = (next: ChannelFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('channel')
    else params.set('channel', next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    setFilter({ marketplace: 'all' })
  }
  /** Channels the backend offers, in display order. */
  const offered = useMemo(() => CHANNEL_ORDER.map((id) => channels.find((c) => c.id === id)).filter((c): c is ChannelConfig => !!c), [channels])
  const multiChannel = offered.length > 1
  const inScope = useMemo(
    () => offered.filter((c) => channelFilter === 'all' || c.id === channelFilter),
    [offered, channelFilter]
  )
  const scopedShipments = useMemo(
    () => (channelFilter === 'all' ? shipments : ofChannel(shipments, channelFilter)),
    [shipments, channelFilter]
  )
  /** One channel in view: copy can name its partner. */
  const scopeChannel = inScope.length === 1 ? SHIPMENT_CHANNELS[inScope[0].id] : null

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
    /** Label downloads in progress, keyed "shipmentId:type"; survives closing the dialog. */
    downloading: Record<string, true>
  }>({ dialog: null, downloading: {} })
  const { dialog, downloading } = ui
  /** The open dialog as of the latest render, for async steps that must not reopen a dialog the seller closed. */
  const openDialogRef = useRef<Dialog>(null)
  openDialogRef.current = dialog
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

  // Deep link from Planner: /shipments?create=1&productIds=1,2,3[&channel=walmart_wfs]
  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    const channel = searchParams.get('channel')
    openDialog({
      type: 'create',
      preselect: (searchParams.get('productIds') ?? '').split(',').filter(Boolean),
      channel: isShipmentChannel(channel) ? channel : undefined,
    })
    router.replace(isShipmentChannel(channel) ? `${pathname}?channel=${channel}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

  // ---- Derived ----
  /** Unassigned units per channel: each channel books from its own pool. */
  const unassignedByChannel = useMemo(
    () =>
      Object.fromEntries(
        offered.map((c) => [c.id, getUnassignedUnits(pools[c.id] ?? [], ofChannel(shipments, c.id))])
      ) as Partial<Record<ShipmentChannel, Record<string, number>>>,
    [offered, pools, shipments]
  )

  const summary = useMemo(() => {
    const by = (st: ShipmentStatus) => scopedShipments.filter((s) => s.status === st)
    const sumUnits = (list: InboundShipment[]) => list.reduce((n, s) => n + getShipmentUnits(s), 0)
    const inProgress = by('in_progress')
    const shipped = by('shipped')
    const receiving = by('receiving')
    const receivingUnits = sumUnits(receiving)
    const receivedUnits = receiving.reduce((n, s) => n + getReceivedUnits(s), 0)
    const perChannel = inScope.map((c) => {
      const unassigned = unassignedByChannel[c.id] ?? {}
      return {
        id: c.id,
        units: Object.values(unassigned).reduce((a, b) => a + b, 0),
        skus: Object.values(unassigned).filter((u) => u > 0).length,
        reserved: (pools[c.id] ?? []).reduce((a, p) => a + p.reserved, 0),
      }
    })
    return {
      perChannel,
      unassignedUnits: perChannel.reduce((a, c) => a + c.units, 0),
      unassignedSkus: perChannel.reduce((a, c) => a + c.skus, 0),
      reservedUnits: perChannel.reduce((a, c) => a + c.reserved, 0),
      inProgressCount: inProgress.length,
      inProgressUnits: sumUnits(inProgress),
      draftCount: inProgress.filter((s) => s.stage === 'draft').length,
      shippedCount: shipped.length,
      shippedUnits: sumUnits(shipped),
      receivingCount: receiving.length,
      receivingUnits,
      receivedPct: receivingUnits ? Math.round((receivedUnits / receivingUnits) * 100) : 0,
    }
  }, [scopedShipments, inScope, unassignedByChannel, pools])

  const channelCounts = useMemo(() => {
    const counts: Record<ChannelFilter, number> = { all: shipments.length, amazon_fba: 0, walmart_wfs: 0 }
    shipments.forEach((s) => counts[channelIdOf(s)]++)
    return counts
  }, [shipments])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: scopedShipments.length,
      in_progress: 0,
      shipped: 0,
      receiving: 0,
      closed: 0,
      cancelled: 0,
    }
    scopedShipments.forEach((s) => counts[s.status]++)
    return counts
  }, [scopedShipments])

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    const has = (value?: string) => !!value && value.toLowerCase().includes(q)
    return scopedShipments
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .filter((s) => marketplaceFilter === 'all' || s.marketplace === marketplaceFilter)
      .filter(
        (s) =>
          !q ||
          has(s.reference) ||
          has(s.name) ||
          has(s.externalRef) ||
          s.legs.some((l) => has(legId(l)) || has(l.shipmentConfirmationId) || has(l.fulfillmentCenter)) ||
          s.items.some((i) => has(i.sku) || has(i.asin) || has(i.gtin) || has(i.title))
      )
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          b.updatedAt.localeCompare(a.updatedAt)
      )
  }, [scopedShipments, statusFilter, marketplaceFilter, debouncedSearch])

  const byId = (id: string | null) => (id ? shipments.find((s) => s.id === id) ?? null : null)
  /** The marketplace's optional features, as the backend reported them. */
  const capabilitiesOf = (s: InboundShipment | null) =>
    (s && channels.find((c) => c.id === channelIdOf(s))?.marketplaces.find((m) => m.id === s.marketplace)?.capabilities) || {}

  // ---- Handlers ----
  /** Runs an action with a success toast; failures toast the server's message (the partner's own text when it has one). */
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

  /** "SHP-0042 sent to Amazon. Inbound plan created." */
  const sentMessage = (s: InboundShipment) =>
    channelIdOf(s) === 'walmart_wfs'
      ? `${s.reference} sent to Walmart. Inbound order created.`
      : `${s.reference} sent to Amazon. Inbound plan created.`

  /**
   * Guided flow: once a step succeeds, open the next one. Labels need no input,
   * so they're generated on the way to "Mark as shipped" in a dialog of their own
   * that replaces the previous one. Closing a dialog just pauses; the row's
   * next-step button resumes from the same place.
   */
  const continueFlow = async (shipment: InboundShipment): Promise<void> => {
    const next = nextActionOf(shipment)
    if (!next) return closeDialog()
    const { action } = next
    const kind = ACTION_TO_OPTION[action]
    if (kind) return openDialog({ type: 'options', id: shipment.id, kind })
    if (action === 'set_packing') return openDialog({ type: 'packing', id: shipment.id })
    if (action === 'enter_carrier') return openDialog({ type: 'carrier', id: shipment.id })
    if (action === 'mark_shipped') return openDialog({ type: 'ship', id: shipment.id })
    if (action === 'generate_labels') return runLabelsStep(shipment)
    closeDialog()
  }

  /**
   * Generates the labels with the labels dialog open, then goes on to Mark as shipped.
   * A failure stays in the dialog with the reason, so the seller can try again from there.
   */
  const runLabelsStep = async (shipment: InboundShipment): Promise<void> => {
    const step: Dialog = { type: 'labels', id: shipment.id }
    openDialog(step)
    try {
      const ready = await generateLabels(shipment.id)
      dispatch(addNotification({ message: `Labels generated for ${shipment.reference}`, type: 'success' }))
      // Only carry on if the seller didn't close the dialog meanwhile
      const open = openDialogRef.current
      if (open?.type === 'labels' && open.id === shipment.id) await continueFlow(ready)
    } catch (err) {
      const error = (err as Error).message || 'Could not generate labels.'
      setUi((prev) =>
        prev.dialog?.type === 'labels' && prev.dialog.id === shipment.id ? { ...prev, dialog: { ...step, error } } : prev
      )
    }
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
        dispatch(addNotification({ message: sentMessage(shipment), type: 'success' }))
        return continueFlow(planned)
      } catch (err) {
        dispatch(addNotification({ message: (err as Error).message || `${channelOf(shipment).partner} rejected the shipment.`, type: 'error' }))
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

  const handleSubmitCarrier = async (id: string, carriers: CarrierEntry[]) => {
    const updated = await submitCarrier(id, carriers)
    dispatch(addNotification({ message: `${updated.reference}: carrier saved and Amazon updated`, type: 'success' }))
    await continueFlow(updated)
  }

  const handleSubmitWfsCarrier = async (id: string, carriers: WfsCarrierEntry[]) => {
    const updated = await submitWfsCarrier(id, carriers)
    const booked = carriers.some((c) => c.mode === 'walmart')
    dispatch(addNotification({ message: `${updated.reference}: ${booked ? 'carrier booked with Walmart' : 'carrier saved'}`, type: 'success' }))
    await continueFlow(updated)
  }

  /** Redoes an earlier step, then reopens the dialog for wherever the shipment landed. */
  const performRewind = async (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) => {
    const label = (byId(id) ? channelOf(byId(id)!) : SHIPMENT_CHANNELS.amazon_fba).rewindLabel[to] ?? to
    const { shipment, notice } = await rewind(id, to, shipFrom)
    dispatch(addNotification({ message: `${shipment.reference}: back to ${label}`, type: 'success' }))
    if (notice) dispatch(addNotification({ message: notice, type: 'warning' }))
    await continueFlow(shipment)
  }

  /** Steps that only change our own record go back straight away; the rest rebuild the partner's plan, so they ask first. */
  const handleBack = (id: string, to: RewindTarget) => {
    const shipment = byId(id)
    if (shipment && channelOf(shipment).instantRewinds.includes(to)) {
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

  const handleSubmitCartons = async (id: string, legs: WfsCartons[]) => {
    const updated = await submitWfsCartons(id, legs)
    dispatch(addNotification({ message: `${updated.reference}: cartons saved`, type: 'success' }))
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
      const file = await downloadLabels(id, type, isSizedLabelType(type) ? labelFormats.selected[type] : undefined)
      const ext = FILE_EXTENSIONS[file.type] ?? 'pdf'
      saveFile(file, `${shipment?.reference ?? 'shipment'}-${LABEL_NAMES[type].toLowerCase().replace(/\s+/g, '-')}.${ext}`)
    } catch (err) {
      dispatch(addNotification({ message: (err as Error).message || `Could not download ${LABEL_NAMES[type].toLowerCase()}`, type: 'error' }))
    } finally {
      setDownloading(key, false)
    }
  }

  const downloadingFor = (id: string): Partial<Record<LabelType, boolean>> =>
    Object.fromEntries((Object.keys(LABEL_NAMES) as LabelType[]).map((t) => [t, !!downloading[`${id}:${t}`]]))

  const openCreate = (channel?: ShipmentChannel) =>
    openDialog({ type: 'create', preselect: [], channel: channel ?? (channelFilter === 'all' ? undefined : channelFilter) })

  /** Save draft holds the units; Confirm with the partner also creates its plan / order. */
  const handleCreate = async (input: CreateShipmentInput, createMode: CreateMode) => {
    let created
    try {
      // Confirming goes on to the partner's plan, so the draft stays hidden until that call returns
      created = await createShipment(input, { deferListRefresh: createMode === 'confirm' })
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
      dispatch(addNotification({ message: sentMessage(created), type: 'success' }))
      return confirmed
    } catch (err) {
      const partner = channelOf(created).partner
      const what = channelIdOf(created) === 'walmart_wfs' ? 'the inbound order' : 'the plan'
      dispatch(addNotification({ message: `${created.reference} saved as a draft, but ${partner} rejected ${what}: ${(err as Error).message}`, type: 'error' }))
      return created
    }
  }

  const cancelTarget = byId(dialogId('cancel'))
  const shippingTarget = byId(dialogId('ship'))
  const packingTarget = byId(dialogId('packing'))
  const carrierTarget = byId(dialogId('carrier'))
  const rewindTarget = dialog?.type === 'rewind' ? byId(dialog.id) : null

  return (
    <LabelFormatProvider value={labelFormats}>
    <Container size="full" className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            {multiChannel
              ? 'Split your reserved stock into Amazon FBA or Walmart WFS inbound shipments and track them to receipt.'
              : 'Split your FBA reserved stock into Amazon inbound shipments and track them to receipt.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NewShipmentButton channels={offered} disabled={summary.unassignedUnits === 0} onCreate={openCreate} />
        </div>
      </div>

      {inScope.filter((c) => c.sandbox).map((c) => (
        <ModeBanner key={c.id} channel={c.id} />
      ))}

      {/* Channel switch */}
      {multiChannel && (
        <div className="mb-4 inline-flex rounded-full border border-border bg-secondary-50 p-1" role="tablist" aria-label="Channel">
          {(['all', ...offered.map((c) => c.id)] as ChannelFilter[]).map((id) => {
            const active = channelFilter === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChannelFilter(id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {id !== 'all' && <ChannelChip channel={id} />}
                {id === 'all' ? 'All channels' : SHIPMENT_CHANNELS[id].label}
                <span className="text-xs text-text-subtle">{channelCounts[id]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard accent="border-t-secondary-800" title={scopeChannel ? `Unassigned ${scopeChannel.program} reserve` : 'Unassigned reserve'}>
          <Metric value={formatUnits(summary.unassignedUnits)} unit="units" />
          <p className="mt-1 text-xs text-text-muted">
            {summary.perChannel.length > 1
              ? summary.perChannel.map((c) => `${SHIPMENT_CHANNELS[c.id].program} ${formatUnits(c.units)}`).join(' · ')
              : `${summary.unassignedSkus} SKU${summary.unassignedSkus !== 1 ? 's' : ''} · ${formatUnits(summary.reservedUnits)} reserved in total`}
          </p>
        </SummaryCard>
        <SummaryCard accent="border-t-warning-500" title="In progress">
          <Metric value={String(summary.inProgressCount)} unit={`shipments · ${formatUnits(summary.inProgressUnits)} units`} />
          <p className="mt-1 text-xs text-text-muted">
            {summary.draftCount} draft{summary.draftCount !== 1 && 's'} not sent to {scopeChannel?.partner ?? 'the partner'} yet
          </p>
        </SummaryCard>
        <SummaryCard accent="border-t-blue-500" title="Shipped">
          <Metric value={String(summary.shippedCount)} unit={`shipments · ${formatUnits(summary.shippedUnits)} units`} />
          <p className="mt-1 text-xs text-text-muted">On the way to {scopeChannel?.partner ?? 'Amazon or Walmart'}</p>
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
            placeholder={multiChannel ? 'Search shipment ID, FBA / WFS ID, FC, SKU or product' : 'Search shipment ID, FBA ID, FC, SKU or product'}
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
          {inScope.map((c) => {
            const options = SHIPMENT_CHANNELS[c.id].marketplaces.map((mp) => (
              <option key={mp} value={mp}>
                {mp}
              </option>
            ))
            return multiChannel ? (
              <optgroup key={c.id} label={SHIPMENT_CHANNELS[c.id].label}>
                {options}
              </optgroup>
            ) : (
              <React.Fragment key={c.id}>{options}</React.Fragment>
            )
          })}
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
                <TableHead>{multiChannel ? 'Channel' : 'Market'}</TableHead>
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
                    {scopedShipments.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">
                          No shipments yet. Allocate stock to {scopeChannel?.program ?? 'FBA or WFS'} in the Planner, then split it into shipments here.
                        </p>
                        <Button onClick={() => openCreate()} disabled={summary.unassignedUnits === 0}>
                          + New shipment
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">No shipments match these filters.</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((s) => {
                  const channel = channelIdOf(s)
                  const pool = pools[channel] ?? []
                  return (
                    <ShipmentRow
                      key={s.id}
                      shipment={s}
                      isExpanded={expanded.has(s.id)}
                      onToggle={() => toggle(s.id)}
                      pool={pool}
                      availableElsewhere={getUnassignedUnits(pool, ofChannel(shipments, channel), s.id)}
                      onChangeShipFrom={(choice) => run(() => setShipFrom(s.id, choice), `${s.reference} will ship from the new address`, 'Could not change the ship-from address')}
                      onSaveItems={(items) =>
                        run(
                          () => saveItems(s.id, items),
                          s.stage === 'plan_created'
                            ? channel === 'walmart_wfs'
                              ? `${s.reference} updated. A new Walmart inbound order was sent.`
                              : `${s.reference} updated. A new Amazon plan was created.`
                            : `${s.reference} quantities saved`,
                          'Could not save quantities'
                        )
                      }
                      onAction={(action) => handleAction(s.id, action)}
                      onCancel={() => openDialog({ type: 'cancel', id: s.id })}
                      onGoBack={(to) => handleBack(s.id, to)}
                      onDownloadLabel={(type) => handleDownloadLabel(s.id, type)}
                      // The open dialog's own buttons show the progress, so the row behind it stays still
                      downloadingLabels={shippingTarget?.id === s.id ? {} : downloadingFor(s.id)}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drawers & dialogs */}
      <CreateShipmentDrawer
        isOpen={dialog?.type === 'create'}
        onClose={closeIfCurrent(dialog?.type === 'create' ? dialog : null)}
        channels={offered}
        initialChannel={dialog?.type === 'create' ? dialog.channel : undefined}
        shipments={shipments}
        initialProductIds={dialog?.type === 'create' ? dialog.preselect : []}
        onCreate={handleCreate}
      />

      {/* Amazon FBA steps */}
      <OptionPickerModal
        kind={dialog?.type === 'options' ? dialog.kind : null}
        shipment={ofChannelOrNull(byId(dialogId('options')), 'amazon_fba')}
        loadOptions={getOptions}
        onConfirm={handleConfirmOptions}
        onBack={() => dialog?.type === 'options' && handleBack(dialog.id, dialog.kind === 'placement' ? 'packing' : 'placement')}
        onEditShipFrom={() => dialog?.type === 'options' && openDialog({ type: 'shipFrom', id: dialog.id })}
        onClose={closeIfCurrent(dialog?.type === 'options' ? dialog : null)}
      />

      <CarrierModal
        shipment={ofChannelOrNull(carrierTarget, 'amazon_fba')}
        onConfirm={(carriers) => handleSubmitCarrier(dialogId('carrier')!, carriers)}
        onBack={() => dialog?.type === 'carrier' && handleBack(dialog.id, 'window')}
        onClose={closeIfCurrent(dialog?.type === 'carrier' ? dialog : null)}
      />

      <EditShipFromModal
        shipment={ofChannelOrNull(byId(dialogId('shipFrom')), 'amazon_fba')}
        onConfirm={(choice) => performRewind(dialogId('shipFrom')!, 'placement', choice)}
        onClose={closeTo(
          dialog?.type === 'shipFrom' ? dialog : null,
          dialog?.type === 'shipFrom' ? { type: 'options', id: dialog.id, kind: 'placement' } : null
        )}
      />

      <PackingModal
        shipment={ofChannelOrNull(packingTarget, 'amazon_fba')}
        loadPlan={getPackingPlan}
        onSubmit={handleSubmitPacking}
        onClose={closeIfCurrent(dialog?.type === 'packing' ? dialog : null)}
      />

      {/* Walmart WFS steps */}
      <WfsCartonsModal
        shipment={ofChannelOrNull(packingTarget, 'walmart_wfs')}
        askSizes={!!capabilitiesOf(packingTarget).walmartCarrier}
        onSubmit={(legs) => handleSubmitCartons(dialogId('packing')!, legs)}
        onClose={closeIfCurrent(dialog?.type === 'packing' ? dialog : null)}
      />

      <WfsCarrierModal
        shipment={ofChannelOrNull(carrierTarget, 'walmart_wfs')}
        walmartCarrier={!!capabilitiesOf(carrierTarget).walmartCarrier}
        loadQuotes={(shipmentId) => quoteWfsCarrier(dialogId('carrier')!, shipmentId)}
        onConfirm={(carriers) => handleSubmitWfsCarrier(dialogId('carrier')!, carriers)}
        onBack={() => dialog?.type === 'carrier' && handleBack(dialog.id, 'packing')}
        onClose={closeIfCurrent(dialog?.type === 'carrier' ? dialog : null)}
      />

      <LabelsStepModal
        shipment={dialog?.type === 'labels' ? byId(dialog.id) : null}
        error={dialog?.type === 'labels' ? dialog.error : undefined}
        onRetry={() => dialog?.type === 'labels' && byId(dialog.id) && runLabelsStep(byId(dialog.id)!)}
        onBack={() => dialog?.type === 'labels' && handleBack(dialog.id, 'carrier')}
        onClose={closeIfCurrent(dialog?.type === 'labels' ? dialog : null)}
      />

      <MarkShippedModal
        shipment={shippingTarget}
        pool={shippingTarget ? pools[channelIdOf(shippingTarget)] ?? [] : []}
        onDownloadLabel={(type) => shippingTarget && handleDownloadLabel(shippingTarget.id, type)}
        downloadingLabels={shippingTarget ? downloadingFor(shippingTarget.id) : {}}
        onBack={() => shippingTarget && handleBack(shippingTarget.id, 'carrier')}
        onClose={closeDialog}
        loadRequirements={getShipRequirements}
        onConfirm={(tracking) => {
          const s = shippingTarget
          const partner = s ? channelOf(s).partner : 'the partner'
          return run(
            () => markShipped(s!.id, tracking),
            `${s?.reference} confirmed with ${partner} and marked as shipped. ${unitsLabel(s ? getShipmentUnits(s) : 0)} deducted from inventory.`,
            'Could not mark as shipped'
          )
        }}
      />

      <ConfirmModal
        isOpen={dialog?.type === 'rewind'}
        title={`Go back to ${dialog?.type === 'rewind' ? (rewindTarget ? channelOf(rewindTarget) : SHIPMENT_CHANNELS.amazon_fba).rewindLabel[dialog.to] ?? dialog.to : ''}?`}
        message={(rewindTarget ? channelOf(rewindTarget) : SHIPMENT_CHANNELS.amazon_fba).copy.rewindWarning}
        confirmLabel="Go back"
        onClose={closeTo(dialog?.type === 'rewind' ? dialog : null, dialog?.type === 'rewind' ? dialog.resume : null)}
        onConfirm={() => performRewind((dialog as { id: string }).id, (dialog as { to: RewindTarget }).to)}
      />

      <ConfirmModal
        isOpen={!!cancelTarget}
        title={`Cancel ${cancelTarget?.reference ?? ''}?`}
        message={
          cancelTarget && (
            <>
              {cancelTarget.externalRef ?? cancelTarget.amazonInboundPlanId
                ? channelIdOf(cancelTarget) === 'walmart_wfs'
                  ? 'The inbound order will be cancelled with Walmart, with all of its shipments. '
                  : 'The inbound plan will be cancelled with Amazon. '
                : `This draft was never sent to ${channelOf(cancelTarget).partner}. `}
              Its {formatUnits(getShipmentUnits(cancelTarget))} units go back to your
              unassigned {channelOf(cancelTarget).program} reserve.
            </>
          )
        }
        confirmLabel="Cancel shipment"
        variant="danger"
        onClose={closeDialog}
        onConfirm={() =>
          run(() => cancelShipment(cancelTarget!.id), `${cancelTarget?.reference} cancelled`, 'Could not cancel shipment')
        }
      />
    </Container>
    </LabelFormatProvider>
  )
}

/** "+ New shipment", with a menu to pick the channel when there's more than one. */
const NewShipmentButton: React.FC<{
  channels: ChannelConfig[]
  disabled: boolean
  onCreate: (channel?: ShipmentChannel) => void
}> = ({ channels, disabled, onCreate }) => {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  if (channels.length <= 1) {
    return (
      <Button onClick={() => onCreate()} disabled={disabled}>
        + New shipment
      </Button>
    )
  }
  return (
    <div ref={anchor} className="flex">
      <Button onClick={() => onCreate()} disabled={disabled} className="!rounded-r-none">
        + New shipment
      </Button>
      <Button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="Pick the channel"
        aria-haspopup="menu"
        aria-expanded={open}
        className="!rounded-l-none border-l border-white/20 !px-2"
      >
        ▾
      </Button>
      <FloatingMenu anchorRef={anchor} open={open} onClose={close} width={260}>
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            role="menuitem"
            disabled={!c.enabled}
            title={c.enabled ? undefined : c.disabledReason}
            onClick={() => {
              setOpen(false)
              onCreate(c.id)
            }}
            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChannelChip channel={c.id} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-primary">{SHIPMENT_CHANNELS[c.id].label} shipment</span>
              <span className="block text-xs text-text-muted">
                {c.enabled ? c.marketplaces.filter((m) => m.capabilities.connected !== false).map((m) => m.id).join(' · ') : c.disabledReason}
              </span>
            </span>
          </button>
        ))}
      </FloatingMenu>
    </div>
  )
}

/** Only shown in sandbox mode, so nobody mistakes the partner's sample data for a real plan. */
const ModeBanner: React.FC<{ channel: ShipmentChannel }> = ({ channel }) => {
  const def = SHIPMENT_CHANNELS[channel]
  return (
    <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
      <strong>{def.partner} sandbox mode.</strong> {def.copy.sandboxBanner}
    </div>
  )
}

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
