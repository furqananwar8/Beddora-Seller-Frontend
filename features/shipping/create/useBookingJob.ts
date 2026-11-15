import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { useGetBookingJobQuery, useGetOrderBookingJobQuery, useGetShipmentQuery, useStartBookingMutation } from '@/services/api/shipping.api'
import type { RealtimeMessage } from '@/services/realtime/topics'
import type { BookingJobDto, BookShipmentBody, ChannelOrderRef, ParcelShipmentDto } from '../types'

/** A finished attempt older than this isn't "what just happened" on a page that was opened later. */
const RECENT_MS = 3 * 60_000
const POLL_MS = 3_000

interface Options {
  /** The order being booked: lets a refreshed page find its booking. */
  order?: ChannelOrderRef
  onBooked: (shipment: ParcelShipmentDto, job: BookingJobDto) => void
  /** A booking of this page's failed (or one that failed while it was away). */
  onFailed: (job: BookingJobDto) => void
}

const recent = (job: BookingJobDto) => Date.now() - new Date(job.finishedAt ?? job.startedAt).getTime() < RECENT_MS

/**
 * Booking runs on the server (its state is in Redis), so this page only starts it and follows it: live over the
 * realtime stream, by polling as a fallback, and after a refresh by asking the server for the order's latest attempt.
 * `running` stays true across a refresh until the server says it is done.
 */
export function useBookingJob({ order, onBooked, onFailed }: Options) {
  const [start, { isLoading: starting }] = useStartBookingMutation()
  const [key, setKey] = useState<string | null>(null)
  const [pushed, setPushed] = useState<BookingJobDto | null>(null)
  const handled = useRef(new Set<string>())

  const byOrder = useGetOrderBookingJobQuery(order ?? { channel: 'walmart', market: '', orderId: '' }, { skip: !order, refetchOnMountOrArgChange: true })
  const byKey = useGetBookingJobQuery(key ?? '', { skip: !key || Boolean(order) })
  const fetched = (order ? byOrder.data : byKey.data) ?? null
  const job = pushed && (!fetched || fetched.key !== pushed.key || pushed.status !== 'RUNNING') ? pushed : fetched
  const running = job?.status === 'RUNNING'

  // Fallback for a missed realtime event: ask again while it runs
  const refetch = order ? byOrder.refetch : byKey.refetch
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => void refetch(), POLL_MS)
    return () => clearInterval(timer)
  }, [running, refetch])

  useRealtime('shipping.booking', (message: RealtimeMessage) => {
    const data = message.data as unknown as BookingJobDto
    const mine = order ? data.order?.orderId === order.orderId && data.order?.channel === order.channel && data.order?.market === order.market : data.key === key
    if (mine) setPushed(data)
  })

  const { data: shipment } = useGetShipmentQuery(job?.shipmentId ?? 0, { skip: job?.status !== 'SUCCEEDED' || !job.shipmentId })

  // Hand the outcome over once. A finished attempt seen only after a refresh counts while it is recent.
  useEffect(() => {
    if (!job || handled.current.has(job.key)) return
    if (job.status === 'FAILED' && (recent(job) || pushed?.key === job.key)) {
      handled.current.add(job.key)
      onFailed(job)
    } else if (job.status === 'SUCCEEDED' && shipment && shipment.id === job.shipmentId && (recent(job) || pushed?.key === job.key)) {
      handled.current.add(job.key)
      onBooked(shipment, job)
    }
  }, [job, shipment, pushed, onBooked, onFailed])

  const begin = useCallback(
    async (body: BookShipmentBody, idempotencyKey: string) => {
      const started = await start({ body, idempotencyKey }).unwrap()
      setKey(started.key)
      setPushed(started)
      return started
    },
    [start]
  )

  return { begin, running: running || starting, job }
}
