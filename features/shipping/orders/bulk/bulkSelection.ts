import type { ChannelOrderRef, OrderListItem } from '../../types'

const KEY = 'shipping.bulk.orders'

/** Most orders one bulk action takes: keeps a batch's quotes and bookings within what the carriers answer in a sitting. */
export const BULK_LIMIT = 50

export const orderKey = ({ channel, market, orderId }: { channel: string; market: string; orderId: string }) => `${channel}:${market}:${orderId}`

/** The Orders list's ticked orders, handed to the bulk booking page across the navigation. */
export function saveBulkOrders(refs: ChannelOrderRef[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(refs))
  } catch {
    // storage unavailable: the bulk page opens empty and says so
  }
}

export function loadBulkOrders(): ChannelOrderRef[] {
  try {
    const refs: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(refs) ? (refs as ChannelOrderRef[]) : []
  } catch {
    return []
  }
}

/** A row's booking state, for what each bulk action can act on. */
export const bookingOf = (row: OrderListItem) => row.booking

export const canBulkBook = (row: OrderListItem) => row.origin === 'CHANNEL' && row.fulfillment === 'TO_BOOK'
/** A label exists to print: booked here and not voided. */
export const canBulkPrint = (row: OrderListItem) => row.booking !== null && !['VOIDED', 'VOID_PENDING', 'FAILED', 'BOOKING'].includes(row.booking.status)
export const canBulkTrack = (row: OrderListItem) => row.booking !== null && !['VOIDED', 'VOID_PENDING', 'FAILED', 'BOOKING', 'DELIVERED'].includes(row.booking.status)
/** Voiding is offered while the label hasn't been scanned. */
export const canBulkVoid = (row: OrderListItem) => row.booking?.status === 'LABEL_CREATED'
/** Rows that can be ticked at all: orders to book, and orders with a parcel booked here. */
export const isSelectable = (row: OrderListItem) => canBulkBook(row) || row.booking !== null
