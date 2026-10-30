'use client'

import React from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Tooltip } from '@/design-system/tooltips'
import { ChannelBadge } from '../shared/ChannelBadge'
import { bookingHref, bookOrderHref, FULFILLMENT_META, money, shortDateTime, titleCase } from '../shippingMeta'
import type { ChannelOrderListItem, ChannelTracking } from '../types'

interface OrdersTableProps {
  rows: ChannelOrderListItem[]
  isLoading: boolean
  isError: boolean
  filtered: boolean
  canWrite: boolean
  /** The booking id whose channel sync is being retried. */
  retrying: number | null
  onRetrySync: (bookingId: number) => void
  onTrack: (tracking: ChannelTracking) => void
}

const HEAD = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 align-top text-sm'
const SHOWN_LINES = 2

/** "SKU × 2" with the product name, then "+n more". */
const Items: React.FC<{ lines: ChannelOrderListItem['lines'] }> = ({ lines }) => (
  <div className="max-w-[16rem] space-y-1">
    {lines.slice(0, SHOWN_LINES).map((line) => (
      <div key={line.lineNumber}>
        <span className="font-mono text-xs">
          {line.sku} × {line.quantity}
        </span>
        <span className="block truncate text-xs text-text-muted" title={line.productName}>
          {line.productName}
        </span>
      </div>
    ))}
    {lines.length > SHOWN_LINES && <span className="text-xs text-text-muted">+{lines.length - SHOWN_LINES} more</span>}
  </div>
)

/** Our booking's carrier and tracking, else what the channel knows, else —. */
const CarrierTracking: React.FC<{ row: ChannelOrderListItem }> = ({ row }) => {
  const shown = row.booking
    ? { carrier: `${row.booking.carrier} · ${row.booking.serviceName}`, number: row.booking.trackingNumber, url: row.booking.trackingUrl }
    : row.tracking[0]
      ? { carrier: row.tracking[0].carrier, number: row.tracking[0].trackingNumber, url: row.tracking[0].trackingUrl }
      : null
  if (!shown) return <span className="text-text-muted">—</span>
  return (
    <div className="max-w-[13rem]">
      <span className="block truncate text-xs text-text-muted">{shown.carrier}</span>
      {shown.number &&
        (shown.url ? (
          <a href={shown.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-primary-600 hover:underline">
            <span className="truncate">{shown.number}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        ) : (
          <span className="block truncate font-mono text-xs">{shown.number}</span>
        ))}
    </div>
  )
}

/** Channel orders: book the seller-fulfilled ones, follow the ones shipped on the channel. */
export const OrdersTable: React.FC<OrdersTableProps> = ({ rows, isLoading, isError, filtered, canWrite, retrying, onRetrySync, onTrack }) => {
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
      </div>
    )
  if (isError) return <p className="p-8 text-center text-sm text-danger-600">Could not load the orders.</p>
  if (rows.length === 0) return <p className="p-8 text-center text-sm text-text-muted">{filtered ? 'No order matches these filters.' : 'No channel orders yet.'}</p>

  const action = (row: ChannelOrderListItem) => {
    switch (row.fulfillment) {
      case 'TO_BOOK':
        return canWrite ? (
          <Link href={bookOrderHref(row)} className="ds-button ds-button-primary ds-button-sm whitespace-nowrap">
            Get rates
          </Link>
        ) : null
      case 'BOOKED':
        return (
          <div className="flex flex-col items-start gap-1.5">
            {row.bookingId !== null && (
              <Link href={bookingHref(row.bookingId)} className="ds-button ds-button-outline ds-button-sm whitespace-nowrap">
                View booking
              </Link>
            )}
            {row.booking?.channelSync === 'FAILED' && (
              <>
                <Tooltip content={row.booking.channelSyncMessage ?? 'The channel refused the shipment update'} multiline>
                  <StatusBadge label="Not marked shipped" tone="warning" />
                </Tooltip>
                {canWrite && (
                  <Button size="sm" variant="ghost" isLoading={retrying === row.booking.id} onClick={() => row.booking && onRetrySync(row.booking.id)}>
                    Retry mark shipped
                  </Button>
                )}
              </>
            )}
          </div>
        )
      case 'SHIPPED_ON_CHANNEL':
        return row.tracking[0] ? (
          <Button size="sm" variant="outline" onClick={() => onTrack(row.tracking[0])}>
            Track
          </Button>
        ) : null
      case 'CANCELLED':
        return null
    }
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          <th className={HEAD}>Order</th>
          <th className={HEAD}>Order date</th>
          <th className={HEAD}>Items</th>
          <th className={HEAD}>Channel status</th>
          <th className={HEAD}>Fulfillment</th>
          <th className={HEAD}>Carrier · Tracking</th>
          <th className={HEAD}>Total</th>
          <th className={HEAD}>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.channel}:${row.market}:${row.orderId}`} className="border-b border-border last:border-0">
            <td className={CELL}>
              <span className="flex items-center gap-2">
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
            <td className={`${CELL} whitespace-nowrap`}>{titleCase(row.channelStatus)}</td>
            <td className={CELL}>
              <StatusBadge label={FULFILLMENT_META[row.fulfillment].label} tone={FULFILLMENT_META[row.fulfillment].tone} />
              {row.booking && <span className="mt-1 block text-xs text-text-muted">{row.booking.statusLabel}</span>}
            </td>
            <td className={CELL}>
              <CarrierTracking row={row} />
            </td>
            <td className={`${CELL} whitespace-nowrap tabular-nums`}>{money(row.total, row.currency)}</td>
            <td className={CELL}>{action(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
