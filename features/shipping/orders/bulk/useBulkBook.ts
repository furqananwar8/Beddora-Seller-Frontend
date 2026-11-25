'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { baseApi } from '@/services/api/baseApi'
import { shippingApi, useGetShippingConfigQuery, useGetShipFromOptionsQuery, useLazyGetChannelOrderQuery, useStartBookingMutation } from '@/services/api/shipping.api'
import { useAppDispatch } from '@/store/hooks'
import { defaultShipFrom } from '../../create/AddressStep'
import { rateIsFresh } from './bulkRates'
import { bulkJobKeys } from '../../bookingAnnounce'
import { sortRates, tagRates } from '../../create/rateRanking'
import { streamRates } from '../../useRateStream'
import type { BookingJobDto, ChannelOrderDetail, ChannelOrderRef, Rate } from '../../types'
import { loadBulkOrders, orderKey } from './bulkSelection'
import { runPool } from './pool'
import { prepareOrder, type PreparedOrder, type ShipmentDefaults } from './prepareOrder'

/** Orders loaded, quoted and booked this many at a time. */
const LOAD_AT_ONCE = 4
const QUOTE_AT_ONCE = 3
const BOOK_AT_ONCE = 3
const POLL_MS = 3_000

export type PickRule = 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE' | 'CARRIER'

interface Quote {
  status: 'idle' | 'loading' | 'done' | 'error'
  quoteId: string | null
  expiresAt: string | null
  rates: Rate[]
  error: string | null
}
export interface BookResult {
  status: 'queued' | 'running' | 'booked' | 'failed'
  bookingNo?: string
  shipmentId?: number
  error?: string
}
interface RowWork {
  quote: Quote
  rateId: string | null
  /** Picked by hand: kept when the rule changes. */
  manual: boolean
  book: BookResult | null
}
const NO_QUOTE: Quote = { status: 'idle', quoteId: null, expiresAt: null, rates: [], error: null }
const NO_WORK: RowWork = { quote: NO_QUOTE, rateId: null, manual: false, book: null }

export interface BulkRow {
  key: string
  ref: ChannelOrderRef
  detail: ChannelOrderDetail | null
  loadError: string | null
  prepared: PreparedOrder | null
  work: RowWork
  rate: Rate | null
}

/** The rate a rule picks from one order's quote: the tagged one, else the cheapest. */
export function pickRate(rates: Rate[], rule: PickRule, carrier: string): string | null {
  if (rates.length === 0) return null
  const cheapest = sortRates(rates, 'PRICE')[0]
  if (rule === 'CARRIER') return (sortRates(rates.filter((rate) => rate.carrier === carrier), 'PRICE')[0] ?? cheapest).rateId
  const tag = rule === 'FASTEST' ? 'FASTEST' : rule === 'BEST_VALUE' ? 'BEST_VALUE' : 'CHEAPEST'
  return (tagRates(rates).find((rate) => rate.tags.includes(tag)) ?? cheapest).rateId
}

/**
 * Bulk booking of the orders ticked in the Orders list: each order is loaded and checked like the single-order flow
 * (see prepareOrder), quoted over the same rate stream, and booked as its own background job with its own
 * idempotency key, so a retry can't buy a label twice and one failure never stops the rest.
 */
export function useBulkBook() {
  const dispatch = useAppDispatch()
  const [loadOrder] = useLazyGetChannelOrderQuery()
  const [startBooking] = useStartBookingMutation()
  const { data: addresses = [], isLoading: loadingAddresses } = useGetShipFromOptionsQuery()
  const { data: config } = useGetShippingConfigQuery()

  const [refs, setRefs] = useState<ChannelOrderRef[] | null>(null)
  const [details, setDetails] = useState<Record<string, { detail?: ChannelOrderDetail; error?: string }>>({})
  const [work, setWork] = useState<Record<string, RowWork>>({})
  const [shipFromId, setShipFromId] = useState<string | null>(null)
  const [defaults, setDefaults] = useState<ShipmentDefaults>({ incoterm: 'DDP', signature: false })
  const [rule, setRule] = useState<{ rule: PickRule; carrier: string }>({ rule: 'CHEAPEST', carrier: '' })

  const alive = useRef(true)
  const abort = useRef<AbortController | null>(null)
  const waiters = useRef(new Map<string, (job: BookingJobDto) => void>())
  const attempts = useRef(new Map<string, string>())
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      abort.current?.abort()
    }
  }, [])

  /** Reads the orders again (the first time, and when a fix made elsewhere may have changed them). */
  const readOrders = useCallback(
    (list: ChannelOrderRef[]) =>
      runPool(list, LOAD_AT_ONCE, async (ref) => {
        try {
          const detail = await loadOrder(ref, false).unwrap()
          if (alive.current) setDetails((current) => ({ ...current, [orderKey(ref)]: { detail } }))
        } catch (error) {
          if (alive.current) setDetails((current) => ({ ...current, [orderKey(ref)]: { error: apiErrorMessage(error, 'Could not load the order') } }))
        }
      }),
    [loadOrder]
  )

  // The ticked orders come from the Orders list
  useEffect(() => {
    const loaded = loadBulkOrders()
    setRefs(loaded)
    void readOrders(loaded)
  }, [readOrders])

  const shipFrom = addresses.find((address) => address.id === (shipFromId ?? defaultShipFrom(addresses)?.id))

  const prepared = useMemo(() => {
    const map = new Map<string, PreparedOrder>()
    Object.entries(details).forEach(([key, { detail }]) => detail && map.set(key, prepareOrder(detail, shipFrom, defaults)))
    return map
  }, [details, shipFrom, defaults])

  const latest = useRef({ prepared, work, rule })
  latest.current = { prepared, work, rule }

  const patch = useCallback((key: string, change: Partial<RowWork>) => setWork((current) => ({ ...current, [key]: { ...(current[key] ?? NO_WORK), ...change } })), [])

  const rows: BulkRow[] = useMemo(
    () =>
      (refs ?? []).map((ref) => {
        const key = orderKey(ref)
        const rowWork = work[key] ?? NO_WORK
        return { key, ref, detail: details[key]?.detail ?? null, loadError: details[key]?.error ?? null, prepared: prepared.get(key) ?? null, work: rowWork, rate: rowWork.quote.rates.find((rate) => rate.rateId === rowWork.rateId) ?? null }
      }),
    [refs, details, prepared, work]
  )

  const loading = refs === null || loadingAddresses || rows.some((row) => !row.detail && !row.loadError)
  /** Ready to be quoted: nothing blocks it. */
  const ready = rows.filter((row) => row.prepared && !row.prepared.problem)

  const quoteOrder = useCallback(
    async (key: string, signal: AbortSignal) => {
      const request = latest.current.prepared.get(key)?.request
      if (!request) return
      patch(key, { quote: { ...NO_QUOTE, status: 'loading' }, rateId: null, book: null })
      const state: Quote = { ...NO_QUOTE, status: 'done' }
      try {
        await streamRates(
          request,
          signal,
          (frame) => {
            if (frame.event === 'quote') {
              state.quoteId = frame.data.quoteId
              state.expiresAt = frame.data.expiresAt
            } else if (frame.event === 'rate') state.rates = [...state.rates, frame.data]
            else if (frame.event === 'done') state.quoteId = frame.data.quoteId
          },
          (failure) => (state.error = failure.error)
        )
      } catch (error) {
        if (signal.aborted) return
        state.error = apiErrorMessage(error, 'Rates could not be loaded')
      }
      if (signal.aborted) return
      const manual = latest.current.work[key]?.manual && state.rates.some((rate) => rate.rateId === latest.current.work[key]?.rateId)
      patch(key, {
        quote: { ...state, status: state.rates.length ? 'done' : 'error', error: state.rates.length ? null : state.error ?? 'No carrier returned a rate' },
        rateId: pickRate(state.rates, latest.current.rule.rule, latest.current.rule.carrier),
        manual: Boolean(manual),
      })
    },
    [patch]
  )

  /** Quotes the given orders (default: every ready one), a few at a time; rows fill in as each answers. */
  const getRates = useCallback(
    async (keys?: string[]) => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      const targets = keys ?? ready.map((row) => row.key)
      await runPool(targets, QUOTE_AT_ONCE, (key) => quoteOrder(key, controller.signal))
    },
    [quoteOrder, ready]
  )

  const pickRule = useCallback(
    (next: PickRule, carrier = '') => {
      setRule({ rule: next, carrier })
      setWork((current) =>
        Object.fromEntries(Object.entries(current).map(([key, row]) => [key, row.manual || row.quote.status !== 'done' ? row : { ...row, rateId: pickRate(row.quote.rates, next, carrier) }]))
      )
    },
    []
  )
  const selectRate = useCallback((key: string, rateId: string) => patch(key, { rateId, manual: true }), [patch])

  /** Orders with a picked rate whose quote is still good. */
  const priced = rows.filter((row) => row.rate)
  const expired = priced.filter((row) => !rateIsFresh(row.work.quote.expiresAt))

  /** Re-reads the blocked orders (or one given), a moment after the last event, so a burst of saves reads once. */
  const syncTimer = useRef<ReturnType<typeof setTimeout>>()
  const syncOrders = (only?: ChannelOrderRef) => {
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      const { prepared: current, work: done } = latest.current
      const stale = (refs ?? []).filter((ref) => {
        const key = orderKey(ref)
        return !done[key]?.book && (only ? orderKey(only) === key : Boolean(current.get(key)?.problem) || !current.has(key))
      })
      if (stale.length) void readOrders(stale)
    }, 600)
  }
  useEffect(() => () => clearTimeout(syncTimer.current), [])

  const settle = useCallback(
    (started: BookingJobDto) =>
      new Promise<BookingJobDto>((resolve) => {
        if (started.status !== 'RUNNING') return resolve(started)
        let timer: ReturnType<typeof setInterval> | undefined
        const finish = (job: BookingJobDto) => {
          if (job.status === 'RUNNING') return
          clearInterval(timer)
          waiters.current.delete(started.key)
          resolve(job)
        }
        waiters.current.set(started.key, finish)
        timer = setInterval(async () => {
          if (!alive.current) return clearInterval(timer)
          try {
            const query = dispatch(shippingApi.endpoints.getBookingJob.initiate(started.key, { forceRefetch: true }))
            const job = await query.unwrap()
            query.unsubscribe()
            finish(job)
          } catch {
            // the next tick asks again
          }
        }, POLL_MS)
      }),
    [dispatch]
  )

  useRealtime('shipping.booking', (message) => {
    const job = message.data as unknown as BookingJobDto
    waiters.current.get(job.key)?.(job)
    // booked on its own page in another tab: read that order again
    if (job.order && job.status === 'SUCCEEDED' && !waiters.current.has(job.key)) syncOrders(job.order)
  })
  // A fix made in another tab (SKU mapped, product details edited) re-reads the orders that were blocked
  useRealtime('inventory.sku-mapping', () => syncOrders())
  useRealtime('procurement.product', () => syncOrders())

  const bookOrder = useCallback(
    async (key: string) => {
      const row = latest.current.work[key]
      const rate = row?.quote.rates.find((item) => item.rateId === row.rateId)
      const ref = refs?.find((item) => orderKey(item) === key)
      if (!row || !rate || !row.quote.quoteId || !ref) return
      patch(key, { book: { status: 'running' } })
      const labelFormat = config?.providers.find((provider) => provider.id === rate.provider)?.labelFormats[0]?.id ?? 'pdf_4x6'
      const body = { quoteId: row.quote.quoteId, rateId: rate.rateId, labelFormat, order: ref }
      const signature = JSON.stringify(body)
      if (!attempts.current.has(signature)) attempts.current.set(signature, crypto.randomUUID())
      try {
        const started = await startBooking({ body, idempotencyKey: attempts.current.get(signature)! }).unwrap()
        bulkJobKeys.add(started.key)
        const job = await settle(started)
        if (!alive.current) return
        if (job.status === 'SUCCEEDED') patch(key, { book: { status: 'booked', bookingNo: job.bookingNo ?? undefined, shipmentId: job.shipmentId ?? undefined } })
        else patch(key, { book: { status: 'failed', error: job.error?.code === 'QUOTE_EXPIRED' ? 'The rate expired: refresh the rates and book again' : job.error?.message ?? 'The booking did not go through' } })
      } catch (error) {
        attempts.current.delete(signature)
        if (alive.current) patch(key, { book: { status: 'failed', error: apiErrorMessage(error, 'Could not start the booking') } })
      }
    },
    [config, patch, refs, settle, startBooking]
  )

  /** Books the given orders (default: every priced one), a few at a time. */
  const book = useCallback(
    async (keys?: string[]) => {
      const targets = keys ?? priced.map((row) => row.key)
      targets.forEach((key) => patch(key, { book: { status: 'queued' } }))
      await runPool(targets, BOOK_AT_ONCE, bookOrder)
      dispatch(baseApi.util.invalidateTags(['ShippingShipments', 'ShippingChannelOrders']))
    },
    [bookOrder, dispatch, patch, priced]
  )

  return {
    rows,
    ready,
    priced,
    expired,
    loading,
    addresses,
    shipFrom,
    setShipFromId,
    defaults,
    setDefaults,
    rule,
    pickRule,
    getRates,
    selectRate,
    book,
    total: priced.reduce((sum, row) => sum + (row.rate?.total ?? 0), 0),
  }
}

export type BulkBook = ReturnType<typeof useBulkBook>
