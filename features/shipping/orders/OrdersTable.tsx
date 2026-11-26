'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import { cn } from '@/utils/cn'
import { Spinner } from '@/design-system/loaders'
import { Tooltip } from '@/design-system/tooltips'
import { ChannelBadge } from '../shared/ChannelBadge'
import { canBulkBook, isSelectable, orderKey, saveBulkOrders, unitsLeft } from './bulk/bulkSelection'
import { CarrierPageLink, TrackingNumber } from '../shared/TrackingNumber'
import { bookingHref, bookOrderHref, BULK_BOOK_HREF, draftHref, FULFILLMENT_META, money, shortDateTime, STATUS_TONE } from '../shippingMeta'
import type { OrderListItem as ChannelOrderListItem } from '../types'

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
  /** Opens Order History: every booking attempt on the order. */
  onHistory: (row: ChannelOrderListItem) => void
  /** Opens the label picker (an order with several labels). */
  onPickLabel: (row: ChannelOrderListItem) => void
  /** Asks to delete the saved draft behind a DRAFT row. */
  onDeleteDraft: (row: ChannelOrderListItem) => void
  /** Builds and downloads the order's tax invoice. */
  onDownloadInvoice: (row: ChannelOrderListItem) => void
  /** Opens the Scan items dialog (In or Out) for the order; omitted when the user can't scan. */
  onScanItems?: (row: ChannelOrderListItem) => void
  /** Who has this order open for scanning (null when free); the Scan items action then reads "Locked by …" and is disabled. */
  scanLockedBy?: (row: ChannelOrderListItem) => string | null
  /** An invoice is being built (one at a time). */
  invoiceBusy: boolean
  /** Ticking rows for the bulk actions; omitted when the user can't act on several orders. */
  selection?: { keys: Set<string>; onToggle: (row: ChannelOrderListItem) => void; onTogglePage: (on: boolean) => void }
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

/** The Status column: how much of the order we shipped (click opens its history), or that the platform did. Fulfillment is separate. */
const ShipStatusCell: React.FC<{ row: ChannelOrderListItem; onHistory: (row: ChannelOrderListItem) => void }> = ({ row, onHistory }) => {
  const status = row.shipStatus
  if (!status?.label) return MUTED
  const tone: StatusTone = status.code === 'SHIPPED' ? 'success' : status.code === 'PARTIAL' ? 'warning' : 'neutral'
  if (status.code === 'SHIPPED_THROUGH') return <StatusBadge label={status.label} tone={tone} />
  return (
    <button type="button" onClick={() => onHistory(row)} title="Order History" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
      <StatusBadge label={status.label} tone={tone} />
    </button>
  )
}

/** Channel orders: book the seller-fulfilled ones, follow the ones shipped on the channel. */
export const OrdersTable: React.FC<OrdersTableProps> = ({ rows, isLoading, isError, filtered, canWrite, retrying, onRetrySync, onOpen, onPrintLabel, onHistory, onPickLabel, onDeleteDraft, onDownloadInvoice, onScanItems, scanLockedBy, invoiceBusy, selection }) => {
  const router = useRouter()
  const pageSelectable = rows.filter(isSelectable)
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
      </div>
    )
  if (isError) return <p className="p-8 text-center text-sm text-danger-600">Could not load the orders.</p>
  if (rows.length === 0) return <p className="p-8 text-center text-sm text-text-muted">{filtered ? 'No order matches these filters.' : 'No orders yet.'}</p>

  /** What can be done with the order, by its state; Get details is always there. */
  const actionsOf = (row: ChannelOrderListItem): RowActionItem[] => {
    // a shipment created by hand has no channel order: its details are the booking, and there is nothing to book, invoice or scan
    if (row.origin === 'MANUAL') {
      // saved unfinished: nothing is booked, so it can only be finished or thrown away
      if (row.fulfillment === 'DRAFT') {
        const draftId = row.draftId
        if (!canWrite || draftId === null) return []
        return [
          { key: 'resume', label: 'Resume', onSelect: () => router.push(draftHref(draftId)) },
          { key: 'delete', label: 'Delete draft', tone: 'danger', onSelect: () => onDeleteDraft(row) },
        ]
      }
      const manual: RowActionItem[] = [{ key: 'booking', label: 'View booking', onSelect: () => row.bookingId !== null && router.push(bookingHref(row.bookingId)) }]
      manual.push({ key: 'label', label: 'Get label', onSelect: () => row.booking && onPrintLabel(row.booking.id), disabled: !row.booking, disabledReason: 'No label for this shipment' })
      return manual
    }
    const items: RowActionItem[] = [{ key: 'details', label: 'Get details', onSelect: () => onOpen(row) }]
    if (canBulkBook(row) && canWrite) {
      const left = unitsLeft(row)
      // an order with several units left can be split into bookings: that is the multi-booking screen, here with this one order
      const toBook = () => {
        if (left > 1) {
          saveBulkOrders([{ channel: row.channel, market: row.market, orderId: row.orderId }])
          router.push(BULK_BOOK_HREF)
        } else router.push(bookOrderHref(row))
      }
      items.push({ key: 'rates', label: row.unitsBooked > 0 ? `Book remaining quantity (${left})` : 'Get rates', onSelect: toBook })
    }
    if (row.unitsBooked > 0 || row.booking) items.push({ key: 'history', label: 'Order History', onSelect: () => onHistory(row) })
    items.push({ key: 'invoice', label: 'Download invoice', onSelect: () => onDownloadInvoice(row), disabled: invoiceBusy, disabledReason: 'An invoice is being prepared' })
    // labels exist for parcels booked here; one shipped on the channel prints from the channel's portal
    const labelFor = row.booking?.id ?? null
    items.push({
      key: 'label',
      label: 'Get label',
      onSelect: () => (row.liveBookingCount > 1 ? onPickLabel(row) : labelFor !== null && onPrintLabel(labelFor)),
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
    if (onScanItems) {
      const lockedBy = scanLockedBy?.(row) ?? null
      items.push({
        key: 'scan',
        label: lockedBy ? `Locked by ${lockedBy}` : 'Scan items',
        onSelect: () => onScanItems(row),
        ...(lockedBy ? { disabled: true, disabledReason: 'Available once they end the session' } : {}),
      })
    }
    return items
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          {selection && (
            <th className={cn(HEAD, 'w-10')}>
              <SelectionCheckbox
                label="Select all orders on this page"
                checked={pageSelectable.length > 0 && pageSelectable.every((row) => selection.keys.has(orderKey(row)))}
                indeterminate={pageSelectable.some((row) => selection.keys.has(orderKey(row))) && !pageSelectable.every((row) => selection.keys.has(orderKey(row)))}
                onChange={() => selection.onTogglePage(!pageSelectable.every((row) => selection.keys.has(orderKey(row))))}
              />
            </th>
          )}
          <th className={HEAD}>Origin</th>
          <th className={HEAD}>Channel</th>
          <th className={HEAD}>Market</th>
          <th className={HEAD}>Order</th>
          <th className={HEAD}>Order date</th>
          <th className={HEAD}>SKU</th>
          <th className={HEAD}>Qty</th>
          <th className={HEAD}>Fulfillment</th>
          <th className={HEAD}>Status</th>
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
              {selection && (
                <td className={CELL}>
                  {isSelectable(row) ? (
                    <SelectionCheckbox label={`Select order ${row.orderId}`} checked={selection.keys.has(orderKey(row))} onChange={() => selection.onToggle(row)} />
                  ) : (
                    <input type="checkbox" disabled aria-label={`Order ${row.orderId} can't be selected`} title="Nothing to book, print or track yet" className="h-4 w-4 cursor-not-allowed rounded border-gray-300 opacity-40" />
                  )}
                </td>
              )}
              <td className={CELL}>
                <StatusBadge label={row.origin === 'MANUAL' ? 'Manual' : 'Channel'} tone={row.origin === 'MANUAL' ? 'warning' : 'info'} />
              </td>
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
                <ShipStatusCell row={row} onHistory={onHistory} />
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
              {/* a shipment created by hand has no order behind it, so no amounts */}
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{row.origin === 'MANUAL' ? MUTED : money(row.amounts.items + row.amounts.shipping + row.amounts.discount, row.currency)}</td>
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{row.origin === 'MANUAL' || row.amounts.tax === null ? MUTED : money(row.amounts.tax, row.currency)}</td>
              <td className={`${CELL} whitespace-nowrap tabular-nums`}>{row.origin === 'MANUAL' ? MUTED : money(row.total, row.currency)}</td>
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
