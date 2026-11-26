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
import { chunkUnits, defaultPlan, detailForUnits, freeUnitNos, planGroups, unitIsMapped, type BookingPlan } from '../orderUnits'
import { loadBulkOrders, orderKey } from './bulkSelection'
import { runPool } from './pool'
import { prepareOrder, unitPackage, type PackageText, type PreparedOrder, type ShipmentDefaults } from './prepareOrder'

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
  /** What carriers said while the rates streamed in ("FedEx: address not serviceable"), shown live under the row. */
  notes: string[]
}
export interface BookResult {
  status: 'queued' | 'running' | 'booked' | 'failed'
  bookingNo?: string
  shipmentId?: number
  trackingNumber?: string
  error?: string
}
interface RowWork {
  quote: Quote
  rateId: string | null
  /** Picked by hand: kept when the rule changes. */
  manual: boolean
  book: BookResult | null
}
const NO_QUOTE: Quote = { status: 'idle', quoteId: null, expiresAt: null, rates: [], error: null, notes: [] }
const NO_WORK: RowWork = { quote: NO_QUOTE, rateId: null, manual: false, book: null }

/** One order as the Review step shows it: its checks, its free units and how it will be split. */
export interface OrderRow {
  key: string
  ref: ChannelOrderRef
  detail: ChannelOrderDetail | null
  loadError: string | null
  /** The whole free part of the order, checked once (ship-to, mapped SKUs, package, customs). */
  prepared: PreparedOrder | null
  /** Unit numbers no booking covers yet whose SKU is mapped: the quantities that can be booked. */
  free: number[]
  /** Free quantities whose SKU is not mapped: shown disabled, and left out of every booking until it is. */
  blocked: number[]
  /** Quantity per booking in effect when the bookings are not built by hand (all free = one booking). */
  split: number
  /** The bookings: unit numbers in each, from the user's plan (`planned`), else cut by `split`. */
  groups: number[][]
  /** What the user chose: SKUs combined or separate, quantity to book now, one shipment or one booking each. */
  plan: BookingPlan
  /** The user has made a choice (otherwise everything is one booking). */
  planned: boolean
  /** Free quantities not in any booking: they stay free to book later. */
  leftOut: number[]
  bookings: number
}

/** One booking: some units of an order with their own package, rates, carrier and label(s). The row of every step after Review. */
export interface BulkRow {
  /** `${order key}#${n}` */
  key: string
  orderKey: string
  ref: ChannelOrderRef
  detail: ChannelOrderDetail | null
  prepared: PreparedOrder | null
  unitNos: number[]
  /** This booking's place among the order's bookings (1-based) and how many there are. */
  index: number
  count: number
  /** Bookings made from one group of units (labels bought per unit) share it. */
  groupId: string
  /** One package per quantity (each with its own size) rather than one for the booking. */
  packagesEach: boolean
  /** Each quantity's package, when `packagesEach`. */
  unitPackages: Record<number, PackageText> | null
  work: RowWork
  rate: Rate | null
}

/** The rate a rule picks from one booking's quote: the tagged one, else the cheapest. */
export function pickRate(rates: Rate[], rule: PickRule, carrier: string): string | null {
  if (rates.length === 0) return null
  const cheapest = sortRates(rates, 'PRICE')[0]
  if (rule === 'CARRIER') return (sortRates(rates.filter((rate) => rate.carrier === carrier), 'PRICE')[0] ?? cheapest).rateId
  const tag = rule === 'FASTEST' ? 'FASTEST' : rule === 'BEST_VALUE' ? 'BEST_VALUE' : 'CHEAPEST'
  return (tagRates(rates).find((rate) => rate.tags.includes(tag)) ?? cheapest).rateId
}

/**
 * Booking of the orders ticked in the Orders list, one booking at a time per group of units. An order with several
 * units free can be split (units per booking, set for all or per order, and optionally one label per unit); each
 * booking is checked like the single-order flow (see prepareOrder) for its own units, quoted over the same rate stream
 * (rows fill in live as each carrier answers), and booked as its own background job with its own idempotency key, so
 * a retry can't buy a label twice and one failure never stops the rest. The job's progress arrives on the realtime
 * stream, with polling as the fallback.
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
  const [defaults, setDefaults] = useState<ShipmentDefaults>({ incoterm: 'DDP', signature: false, protection: false })
  const [rule, setRule] = useState<{ rule: PickRule; carrier: string }>({ rule: 'CHEAPEST', carrier: '' })
  /** Units per booking for every order (0 = all together), and each order's own override. */
  const [splitAll, setSplitAll] = useState(0)
  const [splitOf, setSplitOf] = useState<Record<string, number>>({})
  /** What the user chose per order; an order without an entry is one booking. */
  const [planOf, setPlanOf] = useState<Record<string, BookingPlan>>({})
  /** Bookings that give each quantity its own package, and the sizes typed for them (`${booking key}:${unit number}`). */
  const [eachPkg, setEachPkg] = useState<Record<string, boolean>>({})
  const [unitPkg, setUnitPkg] = useState<Record<string, PackageText>>({})
  /** Package sizes typed per booking, over the ones worked out from the products. */
  const [pkgOf, setPkgOf] = useState<Record<string, PackageText>>({})

  const alive = useRef(true)
  const abort = useRef<AbortController | null>(null)
  const waiters = useRef(new Map<string, (job: BookingJobDto) => void>())
  const attempts = useRef(new Map<string, string>())
  const groupIds = useRef(new Map<string, string>())
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

  /** The Review step's rows: one per order, checked over all of its free units. */
  const orders: OrderRow[] = useMemo(
    () =>
      (refs ?? []).map((ref) => {
        const key = orderKey(ref)
        const detail = details[key]?.detail ?? null
        const allFree = detail ? freeUnitNos(detail) : []
        const blocked = detail ? allFree.filter((unitNo) => !unitIsMapped(detail, unitNo)) : []
        const free = allFree.filter((unitNo) => !blocked.includes(unitNo))
        const split = splitOf[key] ?? splitAll
        // The user's plan wins; it only plans quantities that are still free (not booked elsewhere meanwhile)
        const chosen = planOf[key]
        const groups = chosen && detail ? planGroups(chosen, detail.units, free) : chunkUnits(free, split)
        return {
          key,
          ref,
          detail,
          loadError: details[key]?.error ?? null,
          // checked over what can be booked; an order with nothing mappable is checked as it is, so its problem is named
          prepared: detail ? prepareOrder(detailForUnits(detail, free.length ? free : blocked), shipFrom, defaults) : null,
          free,
          blocked,
          split,
          groups,
          plan: chosen ?? defaultPlan(),
          planned: Boolean(chosen),
          leftOut: free.filter((unitNo) => !groups.some((group) => group.includes(unitNo))),
          bookings: groups.length,
        }
      }),
    [refs, details, splitOf, splitAll, planOf, shipFrom, defaults]
  )

  /** Every booking: the order's bookings as cut by the stepper or built by hand, each with one package or one per quantity. */
  const plan = useMemo(() => {
    const list: Omit<BulkRow, 'work' | 'rate'>[] = []
    for (const order of orders) {
      if (!order.detail || order.groups.length === 0) continue
      order.groups.forEach((unitNos, index) => {
        const key = `${order.key}#${index + 1}`
        const gid = `${order.key}#g${index + 1}`
        if (!groupIds.current.has(gid)) groupIds.current.set(gid, crypto.randomUUID())
        const each = Boolean(eachPkg[key]) && unitNos.length > 1
        const unitPackages = each ? Object.fromEntries(unitNos.map((unitNo) => [unitNo, unitPkg[`${key}:${unitNo}`] ?? unitPackage(order.detail!, unitNo)])) : null
        list.push({
          key,
          orderKey: order.key,
          ref: order.ref,
          detail: order.detail,
          prepared: prepareOrder(detailForUnits(order.detail!, unitNos), shipFrom, defaults, pkgOf[key], unitPackages ? unitNos.map((unitNo) => unitPackages[unitNo]) : undefined),
          unitNos,
          index: index + 1,
          count: order.groups.length,
          groupId: groupIds.current.get(gid)!,
          packagesEach: each,
          unitPackages,
        })
      })
    }
    return list
  }, [orders, shipFrom, defaults, pkgOf, eachPkg, unitPkg])

  const prepared = useMemo(() => new Map(plan.map((booking) => [booking.key, booking.prepared as PreparedOrder])), [plan])

  const latest = useRef({ prepared, work, rule, plan, orders })
  latest.current = { prepared, work, rule, plan, orders }

  const patch = useCallback((key: string, change: Partial<RowWork>) => setWork((current) => ({ ...current, [key]: { ...(current[key] ?? NO_WORK), ...change } })), [])

  const rows: BulkRow[] = useMemo(
    () =>
      plan.map((booking) => {
        const rowWork = work[booking.key] ?? NO_WORK
        return { ...booking, work: rowWork, rate: rowWork.quote.rates.find((rate) => rate.rateId === rowWork.rateId) ?? null }
      }),
    [plan, work]
  )

  const loading = refs === null || loadingAddresses || orders.some((order) => !order.detail && !order.loadError)
  /** Ready to be quoted: nothing blocks it. */
  const ready = rows.filter((row) => row.prepared && !row.prepared.problem)
  const readyOrders = orders.filter((order) => order.prepared && !order.prepared.problem && order.free.length > 0)

  /** A different split makes the old quotes meaningless: they are dropped (the Review step precedes the rates). */
  const dropWork = useCallback((only?: string) => setWork((current) => (only ? Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${only}#`))) : {})), [])
  /** Booking keys change with the bookings, so sizes typed for the old ones are dropped with them. */
  const dropPackages = useCallback((only?: string) => {
    const keep = <T,>(current: Record<string, T>) => Object.fromEntries(Object.entries(current).filter(([key]) => (only ? !key.startsWith(`${only}#`) : false)))
    setPkgOf(keep)
    setEachPkg(keep)
    setUnitPkg(keep)
  }, [])
  /** One booking's quote is stale once its packages change: it is dropped and asked for again. */
  const forgetQuote = useCallback((key: string) => setWork((current) => Object.fromEntries(Object.entries(current).filter(([workKey]) => workKey !== key))), [])
  const setSplitAllUnits = useCallback((size: number) => {
    setSplitAll(Math.max(0, size))
    setSplitOf({})
    setPlanOf({})
    dropWork()
    dropPackages()
  }, [dropWork, dropPackages])
  const setSplitForOrder = useCallback((key: string, size: number) => {
    setSplitOf((current) => ({ ...current, [key]: Math.max(0, size) }))
    setPlanOf((current) => Object.fromEntries(Object.entries(current).filter(([planKey]) => planKey !== key)))
    dropWork(key)
    dropPackages(key)
  }, [dropWork, dropPackages])
  /** Sets how an order is booked (its SKUs combined or separate, how many now, one shipment or one booking each). */
  const setPlan = useCallback((key: string, plan: BookingPlan) => {
    setPlanOf((current) => ({ ...current, [key]: plan }))
    dropWork(key)
    dropPackages(key)
  }, [dropWork, dropPackages])
  /** Types a booking's package size (its rates are asked for again). */
  const setPackage = useCallback((key: string, pkg: PackageText) => {
    setPkgOf((current) => ({ ...current, [key]: pkg }))
    forgetQuote(key)
  }, [forgetQuote])
  /** Back to the size worked out from the products. */
  const resetPackage = useCallback((key: string) => {
    setPkgOf((current) => Object.fromEntries(Object.entries(current).filter(([pkgKey]) => pkgKey !== key)))
    forgetQuote(key)
  }, [forgetQuote])
  /** One package for the booking, or one per quantity. */
  const setPackagesEach = useCallback((key: string, each: boolean) => {
    setEachPkg((current) => ({ ...current, [key]: each }))
    forgetQuote(key)
  }, [forgetQuote])
  /** Types one quantity's package size. */
  const setUnitPackage = useCallback((key: string, unitNo: number, pkg: PackageText) => {
    setUnitPkg((current) => ({ ...current, [`${key}:${unitNo}`]: pkg }))
    forgetQuote(key)
  }, [forgetQuote])
  const resetUnitPackage = useCallback((key: string, unitNo: number) => {
    setUnitPkg((current) => Object.fromEntries(Object.entries(current).filter(([unitKey]) => unitKey !== `${key}:${unitNo}`)))
    forgetQuote(key)
  }, [forgetQuote])

  const quoteBooking = useCallback(
    async (key: string, signal: AbortSignal) => {
      const request = latest.current.prepared.get(key)?.request
      if (!request) return
      patch(key, { quote: { ...NO_QUOTE, status: 'loading' }, rateId: null, book: null })
      const state: Quote = { ...NO_QUOTE, status: 'loading', notes: [] }
      /** Shows what has arrived so far: rates appear (and the rule's pick moves) as each carrier answers. */
      const show = (status: Quote['status'] = 'loading') => {
        if (signal.aborted) return
        const manual = latest.current.work[key]?.manual && state.rates.some((rate) => rate.rateId === latest.current.work[key]?.rateId)
        patch(key, {
          quote: { ...state, rates: [...state.rates], notes: [...state.notes], status },
          rateId: manual ? latest.current.work[key]?.rateId ?? null : pickRate(state.rates, latest.current.rule.rule, latest.current.rule.carrier),
          manual: Boolean(manual),
        })
      }
      try {
        await streamRates(
          request,
          signal,
          (frame) => {
            if (frame.event === 'quote') {
              state.quoteId = frame.data.quoteId
              state.expiresAt = frame.data.expiresAt
            } else if (frame.event === 'rate') {
              state.rates = [...state.rates, frame.data]
              show()
            } else if (frame.event === 'provider' && frame.data.status === 'error') {
              state.notes = [...state.notes, `${frame.data.providerLabel}: ${frame.data.message ?? 'no answer'}`]
              show()
            } else if (frame.event === 'unavailable') {
              state.notes = [...state.notes, `${frame.data.providerLabel ?? frame.data.provider}: ${frame.data.reason}`]
              show()
            } else if (frame.event === 'done') state.quoteId = frame.data.quoteId
          },
          (failure) => (state.error = failure.error)
        )
      } catch (error) {
        if (signal.aborted) return
        state.error = apiErrorMessage(error, 'Rates could not be loaded')
      }
      if (signal.aborted) return
      state.error = state.rates.length ? null : state.error ?? 'No carrier returned a rate'
      show(state.rates.length ? 'done' : 'error')
    },
    [patch]
  )

  /** Quotes the given bookings (default: every ready one), a few at a time; rows fill in as each answers. */
  const getRates = useCallback(
    async (keys?: string[]) => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      const targets = keys ?? ready.map((row) => row.key)
      await runPool(targets, QUOTE_AT_ONCE, (key) => quoteBooking(key, controller.signal))
    },
    [quoteBooking, ready]
  )

  const pickRule = useCallback(
    (next: PickRule, carrier = '') => {
      setRule({ rule: next, carrier })
      setWork((current) =>
        Object.fromEntries(Object.entries(current).map(([key, row]) => [key, row.manual || row.quote.rates.length === 0 ? row : { ...row, rateId: pickRate(row.quote.rates, next, carrier) }]))
      )
    },
    []
  )
  const selectRate = useCallback((key: string, rateId: string) => patch(key, { rateId, manual: true }), [patch])

  /** Bookings with a picked rate whose quote is still good. */
  const priced = rows.filter((row) => row.rate)
  const expired = priced.filter((row) => !rateIsFresh(row.work.quote.expiresAt))

  /** Re-reads the blocked orders (or one given), a moment after the last event, so a burst of saves reads once. */
  const syncTimer = useRef<ReturnType<typeof setTimeout>>()
  const syncOrders = (only?: ChannelOrderRef) => {
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      const { orders: current, work: done } = latest.current
      const stale = current
        .filter((order) => {
          const started = latest.current.plan.some((booking) => booking.orderKey === order.key && done[booking.key]?.book)
          return !started && (only ? orderKey(only) === order.key : Boolean(order.prepared?.problem) || !order.prepared)
        })
        .map((order) => order.ref)
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

  // Each booking's outcome arrives on the realtime stream the moment its job finishes (polling above is only the fallback)
  useRealtime('shipping.booking', (message) => {
    const job = message.data as unknown as BookingJobDto
    waiters.current.get(job.key)?.(job)
    // booked on its own page in another tab: read that order again
    if (job.order && job.status === 'SUCCEEDED' && !waiters.current.has(job.key)) syncOrders(job.order)
  })
  // A fix made in another tab (SKU mapped, product details edited) re-reads the orders that were blocked
  useRealtime('inventory.sku-mapping', () => syncOrders())
  useRealtime('procurement.product', () => syncOrders())

  const bookOne = useCallback(
    async (key: string) => {
      const row = latest.current.work[key]
      const booking = latest.current.plan.find((item) => item.key === key)
      const rate = row?.quote.rates.find((item) => item.rateId === row.rateId)
      if (!row || !rate || !row.quote.quoteId || !booking) return
      patch(key, { book: { status: 'running' } })
      const labelFormat = config?.providers.find((provider) => provider.id === rate.provider)?.labelFormats[0]?.id ?? 'pdf_4x6'
      const body = { quoteId: row.quote.quoteId, rateId: rate.rateId, labelFormat, order: booking.ref, units: booking.unitNos, bookingGroupId: booking.groupId }
      const signature = JSON.stringify(body)
      if (!attempts.current.has(signature)) attempts.current.set(signature, crypto.randomUUID())
      try {
        const started = await startBooking({ body, idempotencyKey: attempts.current.get(signature)! }).unwrap()
        bulkJobKeys.add(started.key)
        const job = await settle(started)
        if (!alive.current) return
        if (job.status === 'SUCCEEDED') patch(key, { book: { status: 'booked', bookingNo: job.bookingNo ?? undefined, shipmentId: job.shipmentId ?? undefined, trackingNumber: job.trackingNumber ?? undefined } })
        else patch(key, { book: { status: 'failed', error: job.error?.code === 'QUOTE_EXPIRED' ? 'The rate expired: refresh the rates and book again' : job.error?.message ?? 'The booking did not go through' } })
      } catch (error) {
        attempts.current.delete(signature)
        if (alive.current) patch(key, { book: { status: 'failed', error: apiErrorMessage(error, 'Could not start the booking') } })
      }
    },
    [config, patch, settle, startBooking]
  )

  /** Books the given bookings (default: every priced one), a few at a time. */
  const book = useCallback(
    async (keys?: string[]) => {
      const targets = keys ?? priced.map((row) => row.key)
      targets.forEach((key) => patch(key, { book: { status: 'queued' } }))
      await runPool(targets, BOOK_AT_ONCE, bookOne)
      dispatch(baseApi.util.invalidateTags(['ShippingShipments', 'ShippingChannelOrders']))
    },
    [bookOne, dispatch, patch, priced]
  )

  return {
    orders,
    rows,
    ready,
    readyOrders,
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
    splitAll,
    setSplitAllUnits,
    setSplitForOrder,
    setPlan,
    setPackagesEach,
    setUnitPackage,
    resetUnitPackage,
    pkgOf,
    unitPkg,
    setPackage,
    resetPackage,
    getRates,
    selectRate,
    book,
    total: priced.reduce((sum, row) => sum + (row.rate?.total ?? 0), 0),
  }
}

export type BulkBook = ReturnType<typeof useBulkBook>
