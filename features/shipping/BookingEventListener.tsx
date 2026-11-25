'use client'

import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { bookedMessage, bulkJobKeys, claimAnnouncement, failedMessage, SELF_HANDLED_CODES } from './bookingAnnounce'
import type { BookingJobDto } from './types'

/**
 * Toasts the outcome of a background booking wherever the user is in the app (they may have left the screen, or
 * refreshed it, while it ran). Rides the realtime stream, so it must be rendered inside `RealtimeProvider`.
 */
export const BookingEventListener: React.FC = () => {
  const dispatch = useAppDispatch()

  useRealtime('shipping.booking', (message) => {
    const job = message.data as unknown as BookingJobDto
    if (job.status === 'RUNNING' || (job.status === 'FAILED' && SELF_HANDLED_CODES.includes(job.error?.code ?? ''))) return
    if (bulkJobKeys.has(job.key) || !claimAnnouncement(job)) return
    dispatch(addNotification(job.status === 'SUCCEEDED' ? { message: bookedMessage(job), type: 'success' } : { message: failedMessage(job), type: 'error' }))
  })

  return null
}
