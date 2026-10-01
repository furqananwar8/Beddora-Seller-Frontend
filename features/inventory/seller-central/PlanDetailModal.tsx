"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Tabs } from '@/design-system/tabs/Tabs'
import {
  SellerCentralPlanDetail,
  SellerCentralShipment,
  useGetSellerCentralPlanQuery,
  useRefreshSellerCentralPlanMutation,
} from '@/services/api/sellerCentralShipments.api'
import { formatDateTime } from '@/utils/format'
import { apiErrorMessage } from '../shipments/useShipments'
import { PlanStatusBadge } from './PlanStatusBadge'

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

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="break-words text-sm font-medium text-text-primary">{children}</dd>
  </div>
)

const HEAD = 'px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wider text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle text-sm'

/** A bordered, horizontally scrollable table shell shared by the tabs. */
const DataTable: React.FC<{ headers: string[]; minWidth?: number; children: React.ReactNode }> = ({ headers, minWidth = 520, children }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm" style={{ minWidth }}>
      <thead className="bg-surface-secondary">
        <tr>
          {headers.map((h) => (
            <th key={h} className={HEAD}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  </div>
)

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-md border border-border bg-surface-secondary px-3 py-6 text-center text-sm text-text-secondary">{children}</p>
)

const confirmationOf = (s: SellerCentralShipment) => s.confirmationId ?? s.shipmentId

// ── Tabs

const OverviewTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const boxes = plan.shipments.reduce((sum, s) => sum + s.boxes, 0)
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Plan ID">
          <span className="font-mono text-xs">{plan.inboundPlanId}</span>
        </Field>
        <Field label="Status">
          <PlanStatusBadge status={plan.status} />
        </Field>
        <Field label="Marketplace">{plan.marketplaces.join(', ') || dash}</Field>
        <Field label="Shipments">{plan.hasDetails ? n(plan.shipmentCount) : dash}</Field>
        <Field label="Total units">{plan.hasDetails ? n(plan.units) : dash}</Field>
        <Field label="SKUs">{plan.hasDetails ? n(plan.skus) : dash}</Field>
        <Field label="Boxes">{plan.hasDetails && boxes > 0 ? n(boxes) : dash}</Field>
        <Field label="Destinations">{plan.destinations.join(', ') || dash}</Field>
        <Field label="Created in Amazon">{plan.createdAt ? formatDateTime(plan.createdAt) : dash}</Field>
        <Field label="Last changed in Amazon">{plan.updatedAt ? formatDateTime(plan.updatedAt) : dash}</Field>
        <Field label="Last synced here">{formatDateTime(plan.syncedAt)}</Field>
      </dl>

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

const ShipmentsTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) =>
  plan.shipments.length === 0 ? (
    <Empty>No shipments in this plan yet.</Empty>
  ) : (
    <DataTable headers={['FBA shipment ID', 'Name', 'Status', 'Destination', 'Units', 'Boxes']} minWidth={640}>
      {plan.shipments.map((s) => (
        <tr key={s.shipmentId}>
          <td className={`${CELL} font-mono text-xs`}>{confirmationOf(s)}</td>
          <td className={CELL}>{s.name ?? dash}</td>
          <td className={CELL}>{s.status ? s.status.replace(/_/g, ' ') : dash}</td>
          <td className={CELL}>
            {s.destination ?? 'Not assigned'}
            {s.destinationCity && <div className="text-xs text-text-muted">{s.destinationCity}</div>}
          </td>
          <td className={CELL}>{n(s.units)}</td>
          <td className={CELL}>{s.boxes > 0 ? n(s.boxes) : dash}</td>
        </tr>
      ))}
    </DataTable>
  )

const ItemsTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) => {
  const rows = plan.shipments.flatMap((s) => s.items.map((item) => ({ item, shipment: s })))
  if (rows.length === 0) return <Empty>No items in this plan yet.</Empty>
  const total = rows.reduce((sum, r) => sum + r.item.quantity, 0)
  return (
    <DataTable headers={['MSKU', 'ASIN', 'FNSKU', 'Shipment', 'Quantity']} minWidth={620}>
      {rows.map(({ item, shipment }) => (
        <tr key={`${shipment.shipmentId}-${item.msku}`}>
          <td className={`${CELL} font-mono text-xs`}>{item.msku}</td>
          <td className={`${CELL} font-mono text-xs`}>{item.asin}</td>
          <td className={`${CELL} font-mono text-xs`}>{item.fnsku}</td>
          <td className={`${CELL} font-mono text-xs`}>{confirmationOf(shipment)}</td>
          <td className={CELL}>{n(item.quantity)}</td>
        </tr>
      ))}
      <tr className="bg-surface-secondary font-semibold">
        <td className={CELL} colSpan={4}>
          Total
        </td>
        <td className={CELL}>{n(total)}</td>
      </tr>
    </DataTable>
  )
}

const DeliveryTab: React.FC<{ plan: SellerCentralPlanDetail }> = ({ plan }) =>
  plan.shipments.length === 0 ? (
    <Empty>No shipments in this plan yet.</Empty>
  ) : (
    <DataTable headers={['FBA shipment ID', 'Ready to ship', 'Delivery window', 'Tracking entered']} minWidth={700}>
      {plan.shipments.map((s) => (
        <tr key={s.shipmentId}>
          <td className={`${CELL} font-mono text-xs`}>{confirmationOf(s)}</td>
          <td className={CELL}>{dateRange(s.readyToShip)}</td>
          <td className={CELL}>{dateRange(s.deliveryWindow)}</td>
          <td className={CELL}>{s.trackingEntered > 0 ? n(s.trackingEntered) : dash}</td>
        </tr>
      ))}
    </DataTable>
  )

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
  if (present.length === 0) return <Empty>Amazon didn&apos;t give a ship-from address for this plan.</Empty>
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {present.map((f) => (
        <Field key={f.key} label={f.label}>
          {address![f.key]}
        </Field>
      ))}
    </dl>
  )
}

/** Everything Amazon holds about one Seller Central shipment plan, split into tabs. */
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
    <Modal isOpen={planId !== null} onClose={onClose} title={plan?.name ?? 'Shipment plan'} size="xl">
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

          <div className="min-h-[220px]">
            {tab === 'overview' && <OverviewTab plan={plan} />}
            {tab === 'shipments' && <ShipmentsTab plan={plan} />}
            {tab === 'items' && <ItemsTab plan={plan} />}
            {tab === 'delivery' && <DeliveryTab plan={plan} />}
            {tab === 'shipFrom' && <ShipFromTab plan={plan} />}
          </div>

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
