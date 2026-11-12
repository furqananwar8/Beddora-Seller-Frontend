'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { Tooltip } from '@/design-system/tooltips'
import { ChannelBadge } from '../shared/ChannelBadge'
import { CarrierPageLink, TrackingNumber } from '../shared/TrackingNumber'
import { bookingHref, bookOrderHref, FULFILLMENT_META, money, shortDateTime, STATUS_TONE } from '../shippingMeta'
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
  /** Opens the print dialog for a booking's label. */
  onPrintLabel: (bookingId: number) => void
  /** Builds and downloads the order's tax invoice. */
  onDownloadInvoice: (row: ChannelOrderListItem) => void
  /** Opens the Scan items dialog (In or Out) for the order; omitted when the user can't scan. */
  onScanItems?: (row: ChannelOrderListItem) => void
  /** An invoice is being built (one at a time). */
  invoiceBusy: boolean
}

const HEAD = 'px-4 py-3 text-center align-middle text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 text-center align-middle text-sm'
const MUTED = <span className="text-text-muted">—</span>

/** The first SKU, then "…" when there are more: the drawer (Get details) lists them all. */
const Skus: React.FC<{ lines: ChannelOrderListItem['lines'] }> = ({ lines }) =>
  lines.length ? (
    <span className="mx-auto block max-w-[16rem] truncate font-mono text-xs" title={lines.map((line) => line.sku).join(', ')}>
      {lines[0].sku}
      {lines.length > 1 && <span className="text-text-muted"> …</span>}
    </span>
  ) : (
    MUTED
  )

/** What the order's tracking columns show: our booking's, else the channel's first package. */
interface TrackingView {
  status: { label: string; tone: StatusTone; detail: string | null } | null
  carrier: string | null
  number: string | null
  url: string | null
  /** More packages than the one shown. */
  more: number
}

function trackingOf(row: ChannelOrderListItem): TrackingView | null {
  const { booking } = row
  if (booking) {
    // the newest stored scan, else the booking's status before the first scan
    const event = booking.latestEvent
    return {
      status: {
        label: event?.statusLabel ?? booking.statusLabel,
        tone: STATUS_TONE[event?.status ?? booking.status],
        detail: event ? [event.description, event.location, shortDateTime(event.occurredAt)].filter(Boolean).join(' · ') : null,
      },
      carrier: `${booking.carrier} · ${booking.serviceName}`,
      number: booking.trackingNumber,
      url: booking.trackingUrl,
      more: 0,
    }
  }
  const shipped = row.tracking[0]
  if (!shipped) return null
  return {
    // the channel's own package status ("SHIPPED") only says the seller confirmed shipment, not where the parcel is:
    // carrier scans for these are read in the drawer
    status: null,
    carrier: shipped.service || shipped.carrier,
    number: shipped.trackingNumber,
    url: shipped.trackingUrl,
    more: row.tracking.length - 1,
  }
}

/** Channel orders: book the seller-fulfilled ones, follow the ones shipped on the channel. */
export const OrdersTable: React.FC<OrdersTableProps> = ({ rows, isLoading, isError, filtered, canWrite, retrying, onRetrySync, onOpen, onPrintLabel, onDownloadInvoice, onScanItems, invoiceBusy }) => {
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
    items.push({ key: 'invoice', label: 'Download invoice', onSelect: () => onDownloadInvoice(row), disabled: invoiceBusy, disabledReason: 'An invoice is being prepared' })
    // labels exist for parcels booked here; one shipped on the channel prints from the channel's portal
    const labelFor = row.booking?.id ?? null
    items.push({
      key: 'label',
      label: 'Get label',
      onSelect: () => labelFor !== null && onPrintLabel(labelFor),
      disabled: labelFor === null,
      disabledReason: row.fulfillment === 'SHIPPED_ON_CHANNEL' ? `Printed from ${row.channelLabel}: it was shipped there` : 'Book a parcel first',
    })
    if (row.fulfillment === 'BOOKED' && row.bookingId !== null) {
      const bookingId = row.bookingId
      items.push({ key: 'booking', label: 'View booking', onSelect: () => router.push(bookingHref(bookingId)) })
      if (row.booking?.channelSync === 'FAILED' && canWrite) {
        const id = row.booking.id
        items.push({ key: 'retry', label: 'Retry mark shipped', onSelect: () => onRetrySync(id), disabled: retrying === id, disabledReason: 'Retrying…' })
      }
    }
    if (onScanItems) items.push({ key: 'scan', label: 'Scan items', onSelect: () => onScanItems(row) })
    return items
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          <th className={HEAD}>Channel</th>
          <th className={HEAD}>Market</th>
          <th className={HEAD}>Order</th>
          <th className={HEAD}>Order date</th>
          <th className={HEAD}>SKU</th>
          <th className={HEAD}>Qty</th>
          <th className={HEAD}>Fulfillment</th>
          <th className={HEAD}>Tracking status</th>
          <th className={HEAD}>Carrier</th>
          <th className={HEAD}>Tracking #</th>
          <th className={HEAD}>Carrier page</th>
          <th className={HEAD}>Net total</th>
          <th className={HEAD}>Tax</th>
          <th className={HEAD}>Total</th>
          <th className={HEAD}>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const tracking = trackingOf(row)
          return (
            <tr key={`${row.channel}:${row.market}:${row.orderId}`} className="border-b border-border last:border-0 hover:bg-secondary-50">
              <td className={CELL}>
                <span className="flex justify-center" title={row.channelLabel}>
                  <ChannelBadge channel={row.channel} />
                </span>
              </td>
              <td className={CELL}>
                <span className="inline-flex" title={row.marketLabel}>
                  {row.marketCountry ? <MarketplaceFlag marketplace={row.marketCountry} /> : <span className="text-xs text-text-muted">{row.marketLabel}</span>}
                </span>
              </td>
              <td className={CELL}>
                <span className="block whitespace-nowrap font-semibold text-text-primary">{row.orderId}</span>
                {row.customerOrderId && <span className="block text-xs text-text-muted">{row.customerOrderId}</span>}
              </td>
              <td className={`${CELL} whitespace-nowrap`}>{shortDateTime(row.orderDate)}</td>
              <td className={CELL}>
                <Skus lines={row.lines} />
              </td>
              {/* every SKU's units, as the SKU column shows only the first */}
              <td className={`${CELL} tabular-nums`}>{row.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
              <td className={CELL}>
                <StatusBadge label={FULFILLMENT_META[row.fulfillment].label} tone={FULFILLMENT_META[row.fulfillment].tone} />
                {row.booking?.channelSync === 'FAILED' && (
                  <Tooltip content={row.booking.channelSyncMessage ?? 'The channel refused the shipment update'} multiline>
                    <StatusBadge label="Not marked shipped" tone="warning" className="mt-1" />
                  </Tooltip>
                )}
              </td>
              <td className={CELL}>
                {tracking?.status ? (
                  <span title={tracking.status.detail ?? undefined}>
                    <StatusBadge label={tracking.status.label} tone={tracking.status.tone} />
                  </span>
                ) : (
                  MUTED
                )}
              </td>
              <td className={CELL}>{tracking?.carrier ? <span className="mx-auto block max-w-[12rem] truncate text-xs">{tracking.carrier}</span> : MUTED}</td>
              <td className={CELL}>
                {tracking?.number ? (
                  <span className="inline-flex items-center whitespace-nowrap text-xs">
                    <TrackingNumber value={tracking.number} nowrap />
                    {tracking.more > 0 && <span className="text-text-muted"> …</span>}
                  </span>
                ) : (
                  MUTED
                )}
              </td>
              <td className={CELL}>{tracking?.url ? <CarrierPageLink url={tracking.url} /> : MUTED}</td>
              {/* what the order is before tax: items, shipping and discounts */}
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{money(row.amounts.items + row.amounts.shipping + row.amounts.discount, row.currency)}</td>
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{row.amounts.tax === null ? MUTED : money(row.amounts.tax, row.currency)}</td>
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{money(row.total, row.currency)}</td>
              <td className={CELL}>
                <div className="flex justify-center">
                  <RowActionsMenu label={row.orderId} items={actionsOf(row)} />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
