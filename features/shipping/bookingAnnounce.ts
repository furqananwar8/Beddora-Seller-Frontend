import type { BookingJobDto } from './types'

/** Booking errors the booking screen answers itself (with its own message and next step), so no generic toast. */
export const SELF_HANDLED_CODES = ['QUOTE_EXPIRED', 'ORDER_NOT_BOOKABLE']

/**
 * True the first time a booking's outcome is announced in this browser session. The realtime listener and the booking
 * screen (which finds the outcome after a refresh) both announce; whichever comes first toasts, the other stays quiet.
 */
export function claimAnnouncement(job: Pick<BookingJobDto, 'key' | 'status'>): boolean {
  const mark = `booking-announced:${job.key}:${job.status}`
  try {
    if (sessionStorage.getItem(mark)) return false
    sessionStorage.setItem(mark, '1')
  } catch {
    // storage unavailable: announce (a rare double toast beats a missed one)
  }
  return true
}

export const bookedMessage = (job: BookingJobDto) => `Booked ${job.bookingNo ?? 'the shipment'}${job.order ? ` for order ${job.order.orderId}` : ''}. The label is ready.`
export const failedMessage = (job: BookingJobDto) => `${job.order ? `Order ${job.order.orderId}: ` : ''}${job.error?.message ?? 'The booking did not go through.'}`

/** Jobs started by a bulk booking: its screen reports them together, so the realtime listener doesn't toast each one. */
export const bulkJobKeys = new Set<string>()
