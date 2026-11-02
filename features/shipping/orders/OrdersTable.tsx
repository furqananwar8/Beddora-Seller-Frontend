'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { Tooltip } from '@/design-system/tooltips'
import { ChannelBadge } from '../shared/ChannelBadge'
import { TrackingNumber } from '../shared/TrackingNumber'
import { bookingHref, bookOrderHref, FULFILLMENT_META, money, shortDateTime, STATUS_TONE, titleCase } from '../shippingMeta'
import type { ChannelOrderListItem } from '../types'

interface OrdersTableProps {
  rows: ChannelOrderListItem[]
  isLoading: boolean
  isError: boolean
  filtered: boolean
  canWrite: boolean
  /** The booking id whose channel sync is being retried. */
  retrying: number | null
  onRetrySync: (bookingId: number) => void
  /** Opens the order's drawer (Get details in the row's actions). */
  onOpen: (row: ChannelOrderListItem) => void
}

const HEAD = 'px-4 py-3 text-center align-middle text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 text-center align-middle text-sm'
const SHOWN_LINES = 2

/** One row per shown line, then "+n more"; Items and Qty use it so each quantity sits level with its SKU. */
const PerLine: React.FC<{ lines: ChannelOrderListItem['lines']; render: (line: ChannelOrderListItem['lines'][number]) => React.ReactNode; className?: string }> = ({ lines, render, className }) => (
  <div className={`space-y-1 ${className ?? ''}`}>
    {lines.slice(0, SHOWN_LINES).map((line) => (
      <div key={line.lineNumber} className="truncate text-xs leading-5">
        {render(line)}
      </div>
    ))}
    {lines.length > SHOWN_LINES && <div className="text-xs leading-5 text-text-muted">+{lines.length - SHOWN_LINES} more</div>}
  </div>
)

/** The order's SKUs. */
const Items: React.FC<{ lines: ChannelOrderListItem['lines'] }> = ({ lines }) => (
  <PerLine lines={lines} className="mx-auto max-w-[16rem]" render={(line) => <span className="font-mono" title={line.productName ?? undefined}>{line.sku}</span>} />
)

/** Units of each SKU. */
const Quantities: React.FC<{ lines: ChannelOrderListItem['lines'] }> = ({ lines }) => (
  <PerLine lines={lines} className="tabular-nums" render={(line) => line.quantity} />
)

/** Carrier, then the copyable tracking number (and carrier page) a parcel can be followed by, anywhere. */
const Tracked: React.FC<{ carrier: string | null; number: string | null; url: string | null }> = ({ carrier, number, url }) => (
  <>
    {carrier && <span className="block truncate text-xs text-text-muted">{carrier}</span>}
    {number && (
      <span className="text-xs">
        <TrackingNumber value={number} url={url} />
      </span>
    )}
  </>
)

/**
 * The latest tracking event and the tracking number: our booking's newest stored scan (else its status, before the
 * first scan), or what the channel shipped with; its scans are read live in the drawer.
 */
const TrackingStatus: React.FC<{ row: ChannelOrderListItem }> = ({ row }) => {
  const { booking } = row
  if (booking) {
    const event = booking.latestEvent
    return (
      <div className="mx-auto max-w-[15rem] space-y-1">
        <StatusBadge label={event?.statusLabel ?? booking.statusLabel} tone={STATUS_TONE[event?.status ?? booking.status]} />
        {event && (
          <span className="block truncate text-xs text-text-muted" title={event.description}>
            {[event.description, event.location, shortDateTime(event.occurredAt)].filter(Boolean).join(' · ')}
          </span>
        )}
        <Tracked carrier={`${booking.carrier} · ${booking.serviceName}`} number={booking.trackingNumber} url={booking.trackingUrl} />
      </div>
    )
  }
  const shipped = row.tracking[0]
  if (!shipped) return <span className="text-text-muted">—</span>
  return (
    <div className="mx-auto max-w-[15rem] space-y-1">
      {shipped.status && <StatusBadge label={titleCase(shipped.status)} tone="success" />}
      <Tracked carrier={shipped.service || shipped.carrier} number={shipped.trackingNumber} url={shipped.trackingUrl} />
      {row.tracking.length > 1 && <span className="block text-xs text-text-muted">+{row.tracking.length - 1} more packages</span>}
    </div>
  )
}

/** Channel orders: book the seller-fulfilled ones, follow the ones shipped on the channel. */
export const OrdersTable: React.FC<OrdersTableProps> = ({ rows, isLoading, isError, filtered, canWrite, retrying, onRetrySync, onOpen }) => {
  const router = useRouter()
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
      </div>
    )
  if (isError) return <p className="p-8 text-center text-sm text-danger-600">Could not load the orders.</p>
  if (rows.length === 0) return <p className="p-8 text-center text-sm text-text-muted">{filtered ? 'No order matches these filters.' : 'No channel orders yet.'}</p>

  /** What can be done with the order, by its state; Get details is always there. */
  const actionsOf = (row: ChannelOrderListItem): RowActionItem[] => {
    const items: RowActionItem[] = [{ key: 'details', label: 'Get details', onSelect: () => onOpen(row) }]
    if (row.fulfillment === 'TO_BOOK' && canWrite) items.push({ key: 'rates', label: 'Get rates', onSelect: () => router.push(bookOrderHref(row)) })
    if (row.fulfillment === 'BOOKED' && row.bookingId !== null) {
      const bookingId = row.bookingId
      items.push({ key: 'booking', label: 'View booking', onSelect: () => router.push(bookingHref(bookingId)) })
      if (row.booking?.channelSync === 'FAILED' && canWrite) {
        const id = row.booking.id
        items.push({ key: 'retry', label: 'Retry mark shipped', onSelect: () => onRetrySync(id), disabled: retrying === id, disabledReason: 'Retrying…' })
      }
    }
    return items
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          <th className={HEAD}>Order</th>
          <th className={HEAD}>Order date</th>
          <th className={HEAD}>Items</th>
          <th className={HEAD}>Qty</th>
          <th className={HEAD}>Channel status</th>
          <th className={HEAD}>Fulfillment</th>
          <th className={HEAD}>Tracking status</th>
          <th className={HEAD}>Total</th>
          <th className={HEAD}>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.channel}:${row.market}:${row.orderId}`} className="border-b border-border last:border-0 hover:bg-secondary-50">
            <td className={CELL}>
              <span className="flex items-center justify-center gap-2">
                <ChannelBadge channel={row.channel} />
                <span className="text-xs text-text-muted">{row.marketLabel}</span>
              </span>
              <span className="mt-1 block font-semibold text-text-primary">{row.orderId}</span>
              {row.customerOrderId && <span className="block text-xs text-text-muted">{row.customerOrderId}</span>}
            </td>
            <td className={`${CELL} whitespace-nowrap`}>{shortDateTime(row.orderDate)}</td>
            <td className={CELL}>
              <Items lines={row.lines} />
            </td>
            <td className={CELL}>
              <Quantities lines={row.lines} />
            </td>
            <td className={`${CELL} whitespace-nowrap`}>{titleCase(row.channelStatus)}</td>
            <td className={CELL}>
              <StatusBadge label={FULFILLMENT_META[row.fulfillment].label} tone={FULFILLMENT_META[row.fulfillment].tone} />
              {row.booking?.channelSync === 'FAILED' && (
                <Tooltip content={row.booking.channelSyncMessage ?? 'The channel refused the shipment update'} multiline>
                  <StatusBadge label="Not marked shipped" tone="warning" className="mt-1" />
                </Tooltip>
              )}
            </td>
            <td className={CELL}>
              <TrackingStatus row={row} />
            </td>
            <td className={`${CELL} whitespace-nowrap tabular-nums`}>{money(row.total, row.currency)}</td>
            <td className={CELL}>
              <div className="flex justify-center">
                <RowActionsMenu label={row.orderId} items={actionsOf(row)} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
