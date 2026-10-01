"use client"

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import {
  SellerCentralShipment,
  useGetSellerCentralPlanQuery,
  useRefreshSellerCentralPlanMutation,
} from '@/services/api/sellerCentralShipments.api'
import { formatDateTime } from '@/utils/format'
import { apiErrorMessage } from '../shipments/useShipments'
import { PlanStatusBadge } from './PlanStatusBadge'

const n = (value: number) => value.toLocaleString()

const dateRange = (range?: { start: string; end: string }) =>
  range ? `${formatDateTime(range.start)} – ${formatDateTime(range.end)}` : '—'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="truncate text-sm font-medium text-text-primary">{children}</dd>
  </div>
)

const ShipmentCard: React.FC<{ shipment: SellerCentralShipment }> = ({ shipment }) => (
  <section className="rounded-lg border border-border">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
      <div className="min-w-0">
        <span className="font-mono text-sm font-semibold text-text-primary">{shipment.confirmationId ?? shipment.shipmentId}</span>
        {shipment.name && <span className="ml-2 text-xs text-text-muted">{shipment.name}</span>}
      </div>
      {shipment.status && <Badge variant="secondary">{shipment.status.replace(/_/g, ' ')}</Badge>}
    </div>

    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-4">
      <Field label="Destination">
        {shipment.destination ?? 'Not assigned'}
        {shipment.destinationCity && <span className="font-normal text-text-muted"> · {shipment.destinationCity}</span>}
      </Field>
      <Field label="Units">{n(shipment.units)}</Field>
      <Field label="Boxes">{shipment.boxes > 0 ? n(shipment.boxes) : '—'}</Field>
      <Field label="Tracking entered">{shipment.trackingEntered > 0 ? n(shipment.trackingEntered) : '—'}</Field>
      <Field label="Delivery window">{dateRange(shipment.deliveryWindow)}</Field>
      <Field label="Ready to ship">{dateRange(shipment.readyToShip)}</Field>
    </dl>

    <div className="overflow-x-auto border-t border-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-text-muted">
            <th className="px-4 py-2 text-center font-semibold">MSKU</th>
            <th className="px-4 py-2 text-center font-semibold">ASIN</th>
            <th className="px-4 py-2 text-center font-semibold">FNSKU</th>
            <th className="px-4 py-2 text-center font-semibold">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {shipment.items.map((item) => (
            <tr key={item.msku} className="border-t border-border">
              <td className="px-4 py-2 text-center align-middle font-mono text-xs">{item.msku}</td>
              <td className="px-4 py-2 text-center align-middle font-mono text-xs">{item.asin}</td>
              <td className="px-4 py-2 text-center align-middle font-mono text-xs">{item.fnsku}</td>
              <td className="px-4 py-2 text-center align-middle">{n(item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)

/** Everything Amazon holds about one Seller Central shipment plan. */
export const PlanDetailModal: React.FC<{
  planId: string | null
  onClose: () => void
  onNotify: (message: string, type: 'success' | 'error') => void
}> = ({ planId, onClose, onNotify }) => {
  const { data: plan, isLoading, isError, error } = useGetSellerCentralPlanQuery(planId ?? '', { skip: !planId })
  const [refresh, { isLoading: refreshing }] = useRefreshSellerCentralPlanMutation()

  const handleRefresh = async () => {
    if (!planId) return
    try {
      await refresh(planId).unwrap()
      onNotify('Shipment details refreshed from Amazon', 'success')
    } catch (err) {
      onNotify(apiErrorMessage(err, 'Could not refresh from Amazon'), 'error')
    }
  }

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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <Field label="Plan ID">
              <span className="font-mono text-xs">{plan.inboundPlanId}</span>
            </Field>
            <Field label="Status">
              <PlanStatusBadge status={plan.status} />
            </Field>
            <Field label="Marketplace">{plan.marketplaces.join(', ') || '—'}</Field>
            <Field label="Total units">{n(plan.units)}</Field>
            <Field label="Created in Amazon">{plan.createdAt ? formatDateTime(plan.createdAt) : '—'}</Field>
            <Field label="Last changed in Amazon">{plan.updatedAt ? formatDateTime(plan.updatedAt) : '—'}</Field>
            <Field label="Ships from">
              {plan.sourceAddress
                ? [plan.sourceAddress.name, plan.sourceAddress.city, plan.sourceAddress.stateOrProvinceCode].filter(Boolean).join(', ')
                : '—'}
            </Field>
            <Field label="Last synced">{formatDateTime(plan.syncedAt)}</Field>
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

          {plan.shipments.map((s) => (
            <ShipmentCard key={s.shipmentId} shipment={s} />
          ))}

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
