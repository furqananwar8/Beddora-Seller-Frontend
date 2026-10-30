import { format, parseISO } from 'date-fns'
import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { ChannelId, ChannelOrderRef, Fulfillment, Handover, Incoterm, ParcelStatus, PriceBreakdown, ProviderId, Rate } from './types'

export const SHIPPING_BASE = '/dashboard/shipping'
export const BOOKINGS_HREF = `${SHIPPING_BASE}/bookings`
export const CREATE_HREF = `${SHIPPING_BASE}/create`
export const ORDERS_HREF = `${SHIPPING_BASE}/orders`
/** Rates › Booking for one channel order. */
export const bookOrderHref = ({ channel, market, orderId }: ChannelOrderRef) => `${ORDERS_HREF}/book?${new URLSearchParams({ channel, market, orderId }).toString()}`
/** The Orders list searched for one order. */
export const orderSearchHref = (orderId: string) => `${ORDERS_HREF}?${new URLSearchParams({ search: orderId }).toString()}`
/** The Bookings list opens this shipment's drawer. */
export const bookingHref = (id: number) => `${BOOKINGS_HREF}?shipment=${id}`

export const PROVIDER_LABEL: Record<ProviderId, string> = { stallion: 'Stallion Express', shippo: 'Shippo', uniuni: 'UniUni' }
export const PROVIDERS = Object.keys(PROVIDER_LABEL) as ProviderId[]
export const CHANNEL_LABEL: Record<ChannelId, string> = { walmart: 'Walmart', amazon: 'Amazon', temu: 'Temu' }

export const STATUS_TONE: Record<ParcelStatus, StatusTone> = {
  BOOKING: 'neutral',
  FAILED: 'danger',
  LABEL_CREATED: 'neutral',
  IN_TRANSIT: 'info',
  OUT_FOR_DELIVERY: 'info',
  EXCEPTION: 'danger',
  DELIVERED: 'success',
  RETURNED: 'warning',
  VOID_PENDING: 'warning',
  VOIDED: 'neutral',
  CARRIER_LOST: 'danger',
}

/** Filter labels; rows show the server's `statusLabel` (which adds the detail after a dash). */
export const STATUS_LABEL: Record<ParcelStatus, string> = {
  BOOKING: 'Booking',
  FAILED: 'Failed',
  LABEL_CREATED: 'Label Created',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out For Delivery',
  EXCEPTION: 'Exception',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  VOID_PENDING: 'Void Pending',
  VOIDED: 'Voided',
  CARRIER_LOST: 'Carrier Lost',
}

export const FULFILLMENT_META: Record<Fulfillment, { label: string; tone: StatusTone }> = {
  TO_BOOK: { label: 'To Book', tone: 'warning' },
  BOOKED: { label: 'Booked', tone: 'info' },
  SHIPPED_ON_CHANNEL: { label: 'Shipped On Channel', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
}

/** "ACKNOWLEDGED" / "in transit" → "Acknowledged" / "In Transit". */
export const titleCase = (value: string) => value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

/** The API's error code: `data.extras.code`, falling back to `data.code`. */
export function apiErrorCode(error: unknown): string | undefined {
  const data = (error as { data?: { code?: string; extras?: { code?: string } } } | undefined)?.data
  return data?.extras?.code ?? data?.code
}

export const INCOTERM_META: Record<Incoterm, { title: string; description: string }> = {
  DDP: { title: 'DDP', description: 'We pay — added to rate' },
  DAP: { title: 'DAP', description: 'Customer pays on delivery' },
  DDU: { title: 'DDU', description: 'Customer pays duties' },
}

export const HANDOVER_META: Record<Handover, { title: string; description: string }> = {
  DROP_OFF: { title: 'Drop-off', description: 'We take it in' },
  PICKUP: { title: 'Pickup', description: 'Carrier collects' },
}

/** `CAD 36.90` */
export const money = (amount: number, currency = 'CAD') => `${currency} ${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const amount = (value: number) => value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** `3–5`, `2`, or null when the provider gave no transit time. */
export function transitDays({ minDays, maxDays }: Pick<Rate, 'minDays' | 'maxDays'>): string | null {
  if (minDays === null && maxDays === null) return null
  if (minDays === null || maxDays === null || minDays === maxDays) return String(minDays ?? maxDays)
  return `${minDays}–${maxDays}`
}

/** A yyyy-mm-dd day as `Thu, Nov 6`. */
export const shortDay = (day: string) => format(parseISO(day), 'EEE, MMM d')

/** `Oct 31, 10:42` */
export const shortDateTime = (iso: string) => format(new Date(iso), 'MMM d, HH:mm')

/** The lines of a price breakdown, in the order they are shown; total aside. */
export function breakdownLines(price: PriceBreakdown, incoterm?: Incoterm): { label: string; amount: number | string }[] {
  const lines: { label: string; amount: number | string }[] = []
  if (price.baseRate !== null) lines.push({ label: 'Base rate', amount: price.baseRate })
  price.surcharges.forEach((surcharge) => lines.push({ label: surcharge.label, amount: surcharge.amount }))
  const dutiesLabel = incoterm ? `Duties (${incoterm})` : 'Duties'
  if (price.duties !== null) lines.push({ label: dutiesLabel, amount: price.duties })
  else if (price.dutiesNote) lines.push({ label: dutiesLabel, amount: price.dutiesNote })
  if (price.taxes !== null) lines.push({ label: 'Taxes', amount: price.taxes })
  return lines
}
