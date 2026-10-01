"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Tabs } from '@/design-system/tabs/Tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import {
  SellerCentralPlanDetail,
  SellerCentralShipment,
  useGetSellerCentralPlanQuery,
  useRefreshSellerCentralPlanMutation,
} from '@/services/api/sellerCentralShipments.api'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { apiErrorMessage } from '../shipments/useShipments'
import { PlanStatusBadge } from './PlanStatusBadge'
import { planTitle } from './planTitle'
import { marketplaceLabels } from './marketplaceLabel'

const PAGE_SIZE = 10
const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const MONO = 'font-mono text-xs'

const n = (value: number) => value.toLocaleString()
const dash = '—'

const dateRange = (range?: { start: string; end: string }) =>
  range ? `${formatDateTime(range.start)} – ${formatDateTime(range.end)}` : dash

type TabId = 'overview' | 'shipments' | 'items' | 'delivery' | 'shipFrom'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'shipments', label: 'Shipments' },
  { id: 'items', label: 'Items' },
  { id: 'delivery', label: 'Delivery & tracking' },
  { id: 'shipFrom', label: 'Ship from' },
]

const confirmationOf = (s: SellerCentralShipment) => s.confirmationId ?? s.shipmentId

// ── Shared table pieces (the same Table, header and cell alignment as the Seller Central list)

interface Column {
  label: string
  className?: string
}

/** A table framed like the list screen: sticky header, scrolls inside its frame, optional paging below. */
const TabTable: React.FC<{ columns: Column[]; empty: string; isEmpty: boolean; footer?: React.ReactNode; children: React.ReactNode }> = ({
  columns,
  empty,
  isEmpty,
  footer,
  children,
}) => (
  <div className="overflow-hidden rounded-lg border border-border shadow-sm">
    <div className="max-h-[min(380px,calc(100vh-380px))] overflow-auto">
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.label} className={cn(HEAD, c.className)}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <div className="py-10 text-center text-text-muted">{empty}</div>
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </div>
    {footer}
  </div>
)

/** Client-side paging for rows we already have (a plan can hold many items). */
function usePaged<T>(rows: T[]) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = useMemo(() => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), [rows, current])
  return { visible, page: current, totalPages, setPage }
}

const PagerFooter: React.FC<{ paged: ReturnType<typeof usePaged>; total: number; label: string }> = ({ paged, total, label }) =>
  paged.totalPages > 1 ? (
    <PaginationFooter
      page={paged.page}
      pageSize={PAGE_SIZE}
      totalItems={total}
      totalPages={paged.totalPages}
      onPageChange={paged.setPage}
      itemLabel={label}
    />
  ) : null

// ── Tabs

const FIELD_COLUMNS: Column[] = [{ label: 'Field', className: 'w-1/3' }, { label: 'Details' }]

const OverviewTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const boxes = plan.shipments.reduce((sum, s) => sum + s.boxes, 0)
  const fields: [string, React.ReactNode][] = [
    ['Plan ID', <span key="id" className={MONO}>{plan.inboundPlanId}</span>],
    ['Status', <PlanStatusBadge key="status" status={plan.status} />],
    ['Marketplace', marketplaceLabels(plan.marketplaces) || dash],
    ['Shipments', plan.hasDetails ? n(plan.shipmentCount) : dash],
    ['Total units', plan.hasDetails ? n(plan.units) : dash],
    ['SKUs', plan.hasDetails ? n(plan.skus) : dash],
    ['Boxes', plan.hasDetails && boxes > 0 ? n(boxes) : dash],
    ['Destinations', plan.destinations.join(', ') || dash],
    ['Created in Amazon', plan.createdAt ? formatDateTime(plan.createdAt) : dash],
    ['Last changed in Amazon', plan.updatedAt ? formatDateTime(plan.updatedAt) : dash],
    ['Last synced here', formatDateTime(plan.syncedAt)],
  ]
  return (
    <div className="space-y-3">
      <TabTable columns={FIELD_COLUMNS} empty="" isEmpty={false}>
        {fields.map(([label, value]) => (
          <TableRow key={label}>
            <TableCell className={cn(CELL, 'text-text-muted')}>{label}</TableCell>
            <TableCell className={cn(CELL, 'font-medium text-text-primary')}>{value}</TableCell>
          </TableRow>
        ))}
      </TabTable>

      {!plan.hasDetails && (
        <p className="rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">
          Amazon hasn&apos;t given us this plan&apos;s shipments yet. Refresh to try again.
        </p>
      )}
      {plan.hasDetails && plan.shipments.length === 0 && (
        <p className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          This plan has no shipments yet. Amazon creates them once a placement option is confirmed in Seller Central.
        </p>
      )}
    </div>
  )
}

const SHIPMENT_COLUMNS: Column[] = [
  { label: 'FBA shipment ID', className: 'min-w-[150px]' },
  { label: 'Name', className: 'min-w-[140px]' },
  { label: 'Status', className: 'min-w-[130px]' },
  { label: 'Destination', className: 'min-w-[150px]' },
  { label: 'Units' },
  { label: 'Boxes' },
]

const ShipmentsTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const paged = usePaged(plan.shipments)
  return (
    <TabTable
      columns={SHIPMENT_COLUMNS}
      isEmpty={plan.shipments.length === 0}
      empty="No shipments in this plan yet."
      footer={<PagerFooter paged={paged} total={plan.shipments.length} label="shipments" />}
    >
      {paged.visible.map((s) => (
        <TableRow key={s.shipmentId}>
          <TableCell className={cn(CELL, MONO)}>{confirmationOf(s)}</TableCell>
          <TableCell className={CELL}>{s.name ?? dash}</TableCell>
          <TableCell className={CELL}>{s.status ? s.status.replace(/_/g, ' ') : dash}</TableCell>
          <TableCell className={CELL}>
            {s.destination ?? 'Not assigned'}
            {s.destinationCity && <div className="text-xs text-text-muted">{s.destinationCity}</div>}
          </TableCell>
          <TableCell className={CELL}>{n(s.units)}</TableCell>
          <TableCell className={CELL}>{s.boxes > 0 ? n(s.boxes) : dash}</TableCell>
        </TableRow>
      ))}
    </TabTable>
  )
}

const ITEM_COLUMNS: Column[] = [
  { label: 'MSKU', className: 'min-w-[220px]' },
  { label: 'ASIN', className: 'min-w-[120px]' },
  { label: 'FNSKU', className: 'min-w-[120px]' },
  { label: 'Shipment', className: 'min-w-[140px]' },
  { label: 'Quantity' },
]

const ItemsTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const rows = useMemo(() => plan.shipments.flatMap((s) => s.items.map((item) => ({ item, shipment: s }))), [plan])
  const paged = usePaged(rows)
  const total = rows.reduce((sum, r) => sum + r.item.quantity, 0)
  return (
    <div className="space-y-2">
      <TabTable
        columns={ITEM_COLUMNS}
        isEmpty={rows.length === 0}
        empty="No items in this plan yet."
        footer={<PagerFooter paged={paged} total={rows.length} label="items" />}
      >
        {paged.visible.map(({ item, shipment }) => (
          <TableRow key={`${shipment.shipmentId}-${item.msku}`}>
            <TableCell className={cn(CELL, MONO)}>{item.msku}</TableCell>
            <TableCell className={cn(CELL, MONO)}>{item.asin}</TableCell>
            <TableCell className={cn(CELL, MONO)}>{item.fnsku}</TableCell>
            <TableCell className={cn(CELL, MONO)}>{confirmationOf(shipment)}</TableCell>
            <TableCell className={CELL}>{n(item.quantity)}</TableCell>
          </TableRow>
        ))}
      </TabTable>
      {rows.length > 0 && (
        <p className="text-right text-sm text-text-muted">
          Total <span className="font-semibold text-text-primary">{n(total)}</span> units across {n(rows.length)} item lines
        </p>
      )}
    </div>
  )
}

const DELIVERY_COLUMNS: Column[] = [
  { label: 'FBA shipment ID', className: 'min-w-[150px]' },
  { label: 'Ready to ship', className: 'min-w-[200px]' },
  { label: 'Delivery window', className: 'min-w-[240px]' },
  { label: 'Tracking entered' },
]

const DeliveryTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const paged = usePaged(plan.shipments)
  return (
    <TabTable
      columns={DELIVERY_COLUMNS}
      isEmpty={plan.shipments.length === 0}
      empty="No shipments in this plan yet."
      footer={<PagerFooter paged={paged} total={plan.shipments.length} label="shipments" />}
    >
      {paged.visible.map((s) => (
        <TableRow key={s.shipmentId}>
          <TableCell className={cn(CELL, MONO)}>{confirmationOf(s)}</TableCell>
          <TableCell className={CELL}>{dateRange(s.readyToShip)}</TableCell>
          <TableCell className={CELL}>{dateRange(s.deliveryWindow)}</TableCell>
          <TableCell className={CELL}>{s.trackingEntered > 0 ? n(s.trackingEntered) : dash}</TableCell>
        </TableRow>
      ))}
    </TabTable>
  )
}

const ADDRESS_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'companyName', label: 'Company' },
  { key: 'addressLine1', label: 'Address line 1' },
  { key: 'addressLine2', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'stateOrProvinceCode', label: 'State / province' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'countryCode', label: 'Country' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'email', label: 'Email' },
]

const ShipFromTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const address = plan.sourceAddress
  const present = address ? ADDRESS_FIELDS.filter((f) => address[f.key]) : []
  return (
    <TabTable columns={FIELD_COLUMNS} isEmpty={present.length === 0} empty="Amazon didn’t give a ship-from address for this plan.">
      {present.map((f) => (
        <TableRow key={f.key}>
          <TableCell className={cn(CELL, 'text-text-muted')}>{f.label}</TableCell>
          <TableCell className={cn(CELL, 'font-medium text-text-primary')}>{address![f.key]}</TableCell>
        </TableRow>
      ))}
    </TabTable>
  )
}

/** Everything Amazon holds about one Seller Central shipment plan, one table per tab. */
export const PlanDetailModal: React.FC<{
  planId: string | null
  onClose: () => void
  onNotify: (message: string, type: 'success' | 'error') => void
}> = ({ planId, onClose, onNotify }) => {
  const { data: plan, isLoading, isError, error } = useGetSellerCentralPlanQuery(planId ?? '', { skip: !planId })
  const [refresh, { isLoading: refreshing }] = useRefreshSellerCentralPlanMutation()
  const [tab, setTab] = useState<TabId>('overview')

  // Each plan opens on its overview
  useEffect(() => setTab('overview'), [planId])

  const handleRefresh = async () => {
    if (!planId) return
    try {
      await refresh(planId).unwrap()
      onNotify('Shipment details refreshed from Amazon', 'success')
    } catch (err) {
      onNotify(apiErrorMessage(err, 'Could not refresh from Amazon'), 'error')
    }
  }

  const counts: Partial<Record<TabId, number>> = plan
    ? { shipments: plan.shipments.length, items: plan.shipments.reduce((sum, s) => sum + s.items.length, 0) }
    : {}

  return (
    <Modal isOpen={planId !== null} onClose={onClose} title={plan ? planTitle(plan.name) : 'Shipment plan'} size="xl">
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {isError && <p className="py-8 text-center text-sm text-danger-600">{apiErrorMessage(error, 'Could not load this shipment plan')}</p>}

      {plan && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Tabs
              size="md"
              activeTab={tab}
              onChange={(id) => setTab(id as TabId)}
              items={TABS.map((t) => ({ id: t.id, label: counts[t.id] !== undefined ? `${t.label} (${counts[t.id]})` : t.label }))}
              className="min-w-max"
            />
          </div>

          {tab === 'overview' && <OverviewTab plan={plan} />}
          {tab === 'shipments' && <ShipmentsTab plan={plan} />}
          {tab === 'items' && <ItemsTab plan={plan} />}
          {tab === 'delivery' && <DeliveryTab plan={plan} />}
          {tab === 'shipFrom' && <ShipFromTab plan={plan} />}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh from Amazon'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
