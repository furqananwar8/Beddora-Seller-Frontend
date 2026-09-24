"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
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
import { AmazonOption, LabelType, Marketplace, ShipmentStatus } from './types'
import { OptionKind, useShipments } from './useShipments'
import {
  MARKETPLACE_META,
  NextAction,
  STATUS_META,
  getReceivedUnits,
  getShipmentUnits,
  getUnassignedUnits,
} from './workflow'
import { ShipmentRow, SHIPMENT_TABLE_COLUMNS } from './ShipmentRow'
import { CreateShipmentDrawer } from './CreateShipmentDrawer'
import { ConfirmModal, MarkShippedModal, OptionPickerModal } from './ShipmentDialogs'
import { formatRelative, formatUnits } from './ShipmentParts'

type StatusFilter = 'all' | ShipmentStatus

const STATUS_ORDER: ShipmentStatus[] = ['in_progress', 'shipped', 'receiving', 'closed', 'cancelled']

const ACTION_TO_OPTION: Partial<Record<NextAction, OptionKind>> = {
  choose_placement: 'placement',
  choose_window: 'window',
  choose_transport: 'transport',
}

const LABEL_NAMES: Record<LabelType, string> = {
  box: 'Box labels',
  pallet: 'Pallet labels',
  unit: 'FNSKU unit labels',
}

export const ShipmentsScreen: React.FC = () => {
  const {
    shipments,
    pool,
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getOptions,
    confirmOption,
    generateLabels,
    markShipped,
    cancelShipment,
    sync,
  } = useShipments()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ---- Filters ----
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [marketplaceFilter, setMarketplaceFilter] = useState<'all' | Marketplace>('all')

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
  const [createOpen, setCreateOpen] = useState(false)
  const [createPreselect, setCreatePreselect] = useState<string[]>([])
  const [picker, setPicker] = useState<{ id: string; kind: OptionKind } | null>(null)
  const [shippingId, setShippingId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Deep link from Planner: /shipments?create=1&productIds=1,2,3
  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    setCreatePreselect((searchParams.get('productIds') ?? '').split(',').filter(Boolean))
    setCreateOpen(true)
    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  // ---- Derived ----
  const unassigned = useMemo(() => getUnassignedUnits(pool, shipments), [pool, shipments])

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
  const run = async (fn: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await fn()
      toast.success(success)
    } catch (err) {
      console.error(err)
      toast.error(failure)
      throw err
    }
  }

  const handleAction = async (id: string, action: NextAction) => {
    const shipment = byId(id)
    if (!shipment) return
    const optionKind = ACTION_TO_OPTION[action]
    if (optionKind) return setPicker({ id, kind: optionKind })
    if (action === 'mark_shipped') return setShippingId(id)
    if (action === 'submit_plan')
      return run(() => submitPlan(id), `${shipment.reference} sent to Amazon. Inbound plan created.`, 'Amazon rejected the inbound plan.')
    if (action === 'generate_labels')
      return run(() => generateLabels(id), `Labels generated for ${shipment.reference}`, 'Could not generate labels.')
  }

  const handleConfirmOption = async (option: AmazonOption) => {
    if (!picker) return
    const s = byId(picker.id)
    const copy: Record<OptionKind, string> = {
      placement: 'Warehouse confirmed',
      window: 'Delivery window booked',
      transport: 'Carrier booked',
    }
    await run(() => confirmOption(picker.id, picker.kind, option), `${s?.reference}: ${copy[picker.kind]}`, 'Amazon rejected this option.')
  }

  const handleDownloadLabel = (id: string, type: LabelType) => {
    const s = byId(id)
    // TODO: GET /inventory/shipments/:id/labels/:type returns a signed PDF URL.
    toast.info(`${LABEL_NAMES[type]} for ${s?.reference} will download once the labels API is connected.`)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await run(sync, 'Shipment statuses synced from Amazon', 'Sync failed')
    } catch {
      /* toast already shown */
    } finally {
      setIsSyncing(false)
    }
  }

  const openCreate = () => {
    setCreatePreselect([])
    setCreateOpen(true)
  }

  const cancelTarget = byId(cancelId)

  return (
    <Container size="full" className="py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            Split your FBA reserved stock into Amazon inbound shipments and track them to receipt.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Synced {formatRelative(lastSyncedAt)}</span>
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
                onClick={() => setStatusFilter(st)}
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

        <div className="relative min-w-[240px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search shipment ID, FBA ID, FC, SKU or product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
          />
        </div>

        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value as 'all' | Marketplace)}
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
                    pool={pool.filter((p) => p.marketplace === s.marketplace)}
                    availableElsewhere={getUnassignedUnits(pool, shipments, s.id)}
                    onSaveItems={(items) =>
                      run(
                        () => saveItems(s.id, items),
                        s.stage === 'plan_created'
                          ? `${s.reference} updated. Inbound plan regenerated.`
                          : `${s.reference} quantities saved`,
                        'Could not save quantities'
                      )
                    }
                    onAction={(action) => handleAction(s.id, action)}
                    onCancel={() => setCancelId(s.id)}
                    onDownloadLabel={(type) => handleDownloadLabel(s.id, type)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drawers & dialogs */}
      <CreateShipmentDrawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        pool={pool}
        unassigned={unassigned}
        initialProductIds={createPreselect}
        onCreate={async (input) => {
          const created = await createShipment(input)
          toast.success(`${created.reference} created as a draft`)
          setStatusFilter('all')
          setExpanded((prev) => new Set(prev).add(created.id))
          return created
        }}
      />

      <OptionPickerModal
        kind={picker?.kind ?? null}
        shipment={byId(picker?.id ?? null)}
        loadOptions={getOptions}
        onConfirm={handleConfirmOption}
        onClose={() => setPicker(null)}
      />

      <MarkShippedModal
        shipment={byId(shippingId)}
        onClose={() => setShippingId(null)}
        onConfirm={() => {
          const s = byId(shippingId)
          return run(
            () => markShipped(shippingId!),
            `${s?.reference} marked as shipped. ${formatUnits(s ? getShipmentUnits(s) : 0)} units deducted from inventory.`,
            'Could not mark as shipped'
          )
        }}
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
        onClose={() => setCancelId(null)}
        onConfirm={() =>
          run(() => cancelShipment(cancelId!), `${cancelTarget?.reference} cancelled`, 'Could not cancel shipment')
        }
      />
    </Container>
  )
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
