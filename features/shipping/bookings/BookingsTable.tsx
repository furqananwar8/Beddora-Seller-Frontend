'use client'

import React from 'react'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { ProviderLogo } from '../shared/ProviderLogo'
import { money, shortDateTime, STATUS_TONE } from '../shippingMeta'
import type { ParcelShipmentListItem, ParcelStatus } from '../types'

interface BookingsTableProps {
  rows: ParcelShipmentListItem[]
  isLoading: boolean
  isError: boolean
  filtered: boolean
  canWrite: boolean
  onOpen: (row: ParcelShipmentListItem) => void
  onPrint: (row: ParcelShipmentListItem) => void
  onCancel: (row: ParcelShipmentListItem) => void
}

const HEAD = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 align-top text-sm'

/** A label can be voided until the carrier scans it; the server has the final say (409 otherwise). */
const NO_LABEL: ParcelStatus[] = ['BOOKING', 'FAILED', 'VOIDED']
/** Unscanned labels this old are flagged: void them before the provider's refund window closes. */
const STALE_DAYS = 5

/** Every booking from every provider. Row click opens the detail drawer. */
export const BookingsTable: React.FC<BookingsTableProps> = ({ rows, isLoading, isError, filtered, canWrite, onOpen, onPrint, onCancel }) => {
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
      </div>
    )
  if (isError) return <p className="p-8 text-center text-sm text-danger-600">Could not load the bookings.</p>
  if (rows.length === 0) return <p className="p-8 text-center text-sm text-text-muted">{filtered ? 'No booking matches these filters.' : 'No bookings yet. Create a shipment to see it here.'}</p>

  const actions = (row: ParcelShipmentListItem): RowActionItem[] => [
    { key: 'print', label: 'Print label', onSelect: () => onPrint(row), disabled: NO_LABEL.includes(row.status), disabledReason: 'No label for this booking' },
    { key: 'open', label: 'Track / open', onSelect: () => onOpen(row) },
    ...(canWrite
      ? [{ key: 'cancel', label: 'Cancel / void', tone: 'danger' as const, onSelect: () => onCancel(row), disabled: !row.canCancel, disabledReason: 'Only labels not scanned yet can be voided' }]
      : []),
  ]

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          <th className={HEAD}>Booking</th>
          <th className={HEAD}>Created</th>
          <th className={HEAD}>Recipient</th>
          <th className={HEAD}>Provider · Service</th>
          <th className={HEAD}>Tracking #</th>
          <th className={HEAD}>Status</th>
          <th className={HEAD}>Total</th>
          <th className={HEAD} aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} onClick={() => onOpen(row)} className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary-50">
            <td className={CELL}>
              <span className="font-semibold text-text-primary">{row.bookingNo}</span>
              <span className="block text-xs text-text-muted">{row.reference ?? '—'}</span>
            </td>
            <td className={`${CELL} whitespace-nowrap`}>{shortDateTime(row.createdAt)}</td>
            <td className={CELL}>
              {row.recipient.name}
              <span className="block text-xs text-text-muted">
                {row.recipient.city}, {row.recipient.province} · {row.recipient.country}
              </span>
            </td>
            <td className={CELL}>
              <span className="flex items-center gap-2">
                <ProviderLogo provider={row.provider} size="sm" />
                <span>
                  {row.serviceName}
                  <span className="block text-xs text-text-muted">{row.providerLabel}</span>
                </span>
              </span>
            </td>
            <td className={`${CELL} max-w-[11rem] truncate font-mono text-xs`} title={row.trackingNumber ?? undefined}>
              {row.trackingNumber ?? '—'}
            </td>
            <td className={CELL}>
              <StatusBadge label={row.statusLabel} tone={STATUS_TONE[row.status]} />
              {row.notScannedDays !== null && row.notScannedDays >= STALE_DAYS && <StatusBadge label={`Not scanned · ${row.notScannedDays} days`} tone="warning" className="mt-1" />}
            </td>
            <td className={`${CELL} whitespace-nowrap tabular-nums ${row.status === 'VOIDED' ? 'text-text-muted line-through' : ''}`}>{money(row.total, row.currency)}</td>
            <td className={`${CELL} text-right`}>
              <RowActionsMenu label={row.bookingNo} items={actions(row)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
