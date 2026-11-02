'use client'

import React from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { useGetChannelOrderQuery } from '@/services/api/shipping.api'
import { ChannelBadge } from '../shared/ChannelBadge'
import { ChannelSyncNotice } from '../shared/ChannelSyncNotice'
import { ProviderLogo } from '../shared/ProviderLogo'
import { DrawerDetail as Detail, DrawerDetails, DrawerSection as Section, SideDrawer } from '../shared/SideDrawer'
import { TrackingNumber } from '../shared/TrackingNumber'
import { TrackingTimeline } from '../shared/TrackingTimeline'
import { bookingHref, bookOrderHref, FULFILLMENT_META, money, shortDateTime, STATUS_TONE, titleCase } from '../shippingMeta'
import type { ChannelOrderListItem, ChannelOrderRef, ChannelTracking, ShipAddress } from '../types'

interface OrderDrawerProps {
  /** The order shown; null keeps the drawer closed. */
  order: ChannelOrderRef | null
  canWrite: boolean
  onClose: () => void
}

/** One package the channel shipped: carrier, service, number, latest status and the carrier's scans. */
const ChannelPackage: React.FC<{ tracking: ChannelTracking; index: number; count: number }> = ({ tracking, index, count }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <b className="text-sm text-text-primary">{tracking.service || tracking.carrier || 'Carrier not named'}</b>
        <div className="text-xs text-text-muted">
          {[count > 1 && `Package ${index + 1} of ${count}`, tracking.service && tracking.carrier, tracking.shippedAt && `Shipped ${shortDateTime(tracking.shippedAt)}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      {/* only a carrier's status: the channel's "SHIPPED" just means the seller confirmed shipment */}
      {tracking.events?.length && tracking.status ? <StatusBadge label={titleCase(tracking.status)} tone={STATUS_TONE[tracking.events[0].status]} /> : null}
    </div>
    <div className="text-sm">
      <TrackingNumber value={tracking.trackingNumber} url={tracking.trackingUrl} />
    </div>
    <div className="pt-2">
      <TrackingTimeline events={tracking.events ?? []} emptyText={tracking.trackingNote ?? 'No carrier scans yet.'} />
      {tracking.trackedBy && (tracking.events?.length ?? 0) > 0 && <p className="mt-3 text-xs text-text-muted">Scans via {tracking.trackedBy}</p>}
    </div>
  </div>
)

/** Our booking for the order: provider, service, status and tracking, with the booking's own drawer one click away. */
const OurBooking: React.FC<{ order: ChannelOrderListItem }> = ({ order }) => {
  const booking = order.booking!
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={booking.provider} />
        <div className="min-w-0 flex-1">
          <b className="text-sm text-text-primary">{booking.serviceName}</b>
          <div className="text-xs text-text-muted">
            {booking.providerLabel} · {booking.carrier} ·{' '}
            <Link href={bookingHref(booking.id)} className="font-semibold text-primary-600 hover:underline">
              {booking.bookingNo}
            </Link>
          </div>
        </div>
        <StatusBadge label={booking.statusLabel} tone={STATUS_TONE[booking.status]} />
      </div>
      <div className="text-sm">
        <TrackingNumber value={booking.trackingNumber} url={booking.trackingUrl} />
      </div>
      <ChannelSyncNotice shipmentId={booking.id} channelLabel={order.channelLabel} sync={booking.channelSync} message={booking.channelSyncMessage} />
    </div>
  )
}

const HEAD = 'pb-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const NUM = 'whitespace-nowrap py-2 text-right tabular-nums'

/** "—" for an amount the channel doesn't report. */
const amount = (value: number | null, currency: string) => (value === null ? '—' : money(value, currency))

/** Order number, market, date, units, and how the total adds up. */
const OrderSummary: React.FC<{ order: ChannelOrderListItem }> = ({ order }) => {
  const { amounts, currency } = order
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0)
  return (
    <DrawerDetails>
      <Detail label="Order #">{order.orderId}</Detail>
      {order.customerOrderId && <Detail label="Customer #">{order.customerOrderId}</Detail>}
      <Detail label="Market">{order.marketLabel}</Detail>
      <Detail label="Ordered">{shortDateTime(order.orderDate)}</Detail>
      <Detail label="Quantity">
        {units} {units === 1 ? 'unit' : 'units'} · {order.lines.length} {order.lines.length === 1 ? 'SKU' : 'SKUs'}
      </Detail>
      <Detail label="Items">{money(amounts.items, currency)}</Detail>
      {amounts.shipping !== 0 && <Detail label="Shipping">{money(amounts.shipping, currency)}</Detail>}
      {amounts.discount !== 0 && <Detail label="Discount">{money(amounts.discount, currency)}</Detail>}
      <Detail label="Tax">{amounts.tax === null ? `Not reported by ${order.channelLabel}` : money(amounts.tax, currency)}</Detail>
      <Detail label="Total">
        <b>{money(order.total, currency)}</b>
      </Detail>
    </DrawerDetails>
  )
}

/** The buyer as the channel shares them today: name, contact and ship-to address. */
const Customer: React.FC<{ customer: ShipAddress | null; note: string | null; channelLabel: string }> = ({ customer, note, channelLabel }) => {
  if (!customer) return <p className="text-sm text-text-muted">{note ?? 'The channel did not share the customer.'}</p>
  const street = [customer.address1, customer.address2].filter(Boolean).join(', ')
  const place = [customer.city, [customer.province, customer.postalCode].filter(Boolean).join(' '), customer.country].filter(Boolean).join(', ')
  // channels can share only part of the customer (Amazon: city and postal code without the restricted-data role)
  const withheld = [!customer.name && 'name', !street && 'street address', !customer.phone && 'phone'].filter(Boolean)
  return (
    <>
    {withheld.length > 0 && <p className="mb-3 text-xs text-text-muted">{channelLabel} didn&apos;t share the customer&apos;s {withheld.join(', ')}.</p>}
    <DrawerDetails>
      <Detail label="Name">{customer.name || '—'}</Detail>
      {customer.company && <Detail label="Company">{customer.company}</Detail>}
      <Detail label="Phone">{customer.phone ? <a href={`tel:${customer.phone}`} className="text-primary-600 hover:underline">{customer.phone}</a> : '—'}</Detail>
      {customer.email && (
        <Detail label="Email">
          <a href={`mailto:${customer.email}`} className="break-all text-primary-600 hover:underline">
            {customer.email}
          </a>
        </Detail>
      )}
      <Detail label="Ship to">
        {street && <span className="block">{street}</span>}
        <span className="block">{place}</span>
        <span className="block text-xs text-text-muted">{customer.residential ? 'Residential' : 'Commercial'}</span>
      </Detail>
    </DrawerDetails>
    </>
  )
}

/** Each SKU with its quantity, unit price and tax. */
const OrderItems: React.FC<{ order: ChannelOrderListItem }> = ({ order }) => (
  // nothing is cut: rows wider than the drawer scroll sideways
  <div className="-mx-5 overflow-x-auto px-5">
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          <th className={`${HEAD} pr-6`}>SKU</th>
          <th className={`${HEAD} pl-3 text-right`}>Qty</th>
          <th className={`${HEAD} pl-6 text-right`}>Unit price</th>
          <th className={`${HEAD} pl-6 text-right`}>Tax</th>
        </tr>
      </thead>
      <tbody>
        {order.lines.map((line) => (
          <tr key={line.lineNumber} className="border-t border-border align-top">
            {/* globals.css caps table cells at 300px (200px with whitespace-nowrap): this one shows the full name */}
            <td className="!max-w-none py-2 pr-6">
              <span className="block whitespace-nowrap font-mono text-xs">{line.sku}</span>
              {line.productName && <span className="block whitespace-nowrap text-xs text-text-muted">{line.productName}</span>}
            </td>
            <td className={`${NUM} pl-3`}>{line.quantity}</td>
            <td className={`${NUM} pl-6`}>{amount(line.unitPrice, line.currency ?? order.currency)}</td>
            <td className={`${NUM} pl-6`}>{amount(line.tax, line.currency ?? order.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/**
 * The carrier's latest scan: our booking's newest stored event, else the newest one a tracker read for the
 * channel's first package. Nothing for orders that haven't shipped.
 */
const LatestTracking: React.FC<{ order: ChannelOrderListItem }> = ({ order }) => {
  const event = order.booking?.latestEvent ?? order.tracking.find((pkg) => pkg.events?.length)?.events?.[0] ?? null
  const shipped = order.booking !== null || order.tracking.length > 0
  if (!shipped) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-text-muted">Tracking</span>
      {event ? (
        <>
          <StatusBadge label={event.statusLabel} tone={STATUS_TONE[event.status]} />
          <span className="text-text-muted">{[event.description, event.location, shortDateTime(event.occurredAt)].filter(Boolean).join(' · ')}</span>
        </>
      ) : (
        <span className="text-text-muted">No carrier scans yet</span>
      )}
    </div>
  )
}

/** What the order still needs, in a sentence. */
const NEXT_STEP: Record<ChannelOrderListItem['fulfillment'], string> = {
  NOT_READY: 'The channel has not released this order for shipping yet (payment pending).',
  TO_BOOK: 'No carrier yet. Get rates to book it with one of our providers.',
  BOOKED: '',
  SHIPPED_ON_CHANNEL: '',
  CANCELLED: 'This order was cancelled on the channel.',
}

/**
 * One channel order: shipped on the channel (its carrier and tracking), booked by us (our booking), or still to book
 * (Get rates). Opened from Get details in a row's actions on the Orders list.
 */
export const OrderDrawer: React.FC<OrderDrawerProps> = ({ order: ref, canWrite, onClose }) => {
  // currentData, not data: data keeps the previously opened order while this one loads
  const { currentData: data, isFetching, isError } = useGetChannelOrderQuery(ref ?? { channel: 'walmart', market: '', orderId: '' }, { skip: ref === null })
  const order = data?.order

  return (
    <SideDrawer
      open={ref !== null}
      title={ref?.orderId ?? 'Order'}
      subtitle={order && `${order.channelLabel} · ${order.marketLabel} · Ordered ${shortDateTime(order.orderDate)}`}
      onClose={onClose}
      state={!order && isFetching ? 'loading' : isError || !order ? 'error' : 'ready'}
      errorMessage="Could not load this order."
    >
      {order && (
        <>
          <div className="space-y-3 px-5 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <ChannelBadge channel={order.channel} />
              <StatusBadge label={FULFILLMENT_META[order.fulfillment].label} tone={FULFILLMENT_META[order.fulfillment].tone} />
            </div>
            <LatestTracking order={order} />
            {NEXT_STEP[order.fulfillment] && <p className="text-sm text-text-muted">{NEXT_STEP[order.fulfillment]}</p>}
            {order.fulfillment === 'TO_BOOK' && canWrite && (
              <Link href={bookOrderHref(order)} className="ds-button ds-button-primary ds-button-sm inline-flex">
                Get rates
              </Link>
            )}
          </div>

          <Section title="Order">
            <OrderSummary order={order} />
          </Section>

          <Section title="Customer">
            <Customer customer={data.shipTo} note={data.shipToError} channelLabel={order.channelLabel} />
          </Section>

          {order.booking && (
            <Section title="Our booking">
              <OurBooking order={order} />
            </Section>
          )}

          {order.tracking.length > 0 && (
            <Section title={`Shipped on ${order.channelLabel}`}>
              <div className="space-y-4">
                {order.tracking.map((tracking, index) => (
                  <ChannelPackage key={tracking.trackingNumber} tracking={tracking} index={index} count={order.tracking.length} />
                ))}
              </div>
            </Section>
          )}
          {order.fulfillment === 'SHIPPED_ON_CHANNEL' && order.tracking.length === 0 && (
            <Section title={`Shipped on ${order.channelLabel}`}>
              <p className="text-sm text-text-muted">{order.channelLabel} has not shared a tracking number for this order.</p>
            </Section>
          )}

          <Section title="Items">
            <OrderItems order={order} />
          </Section>
        </>
      )}
    </SideDrawer>
  )
}
