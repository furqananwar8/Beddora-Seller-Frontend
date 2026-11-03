import type { Rate, RateTag } from '../types'

export type RateSort = 'PRICE' | 'TIME'

export const RATE_SORTS: Array<{ value: RateSort; label: string }> = [
  { value: 'PRICE', label: 'Total Price' },
  { value: 'TIME', label: 'Delivery Time' },
]

export const TAG_LABEL: Record<RateTag, string> = { CHEAPEST: 'Cheapest', FASTEST: 'Fastest', BEST_VALUE: 'Best value' }

/** Slowest promised day; unknown transit sorts last. */
const days = (rate: Rate) => rate.maxDays ?? rate.minDays ?? Number.POSITIVE_INFINITY

const byPrice = (a: Rate, b: Rate) => a.total - b.total || days(a) - days(b)
const byTime = (a: Rate, b: Rate) => days(a) - days(b) || a.total - b.total

export const sortRates = (rates: Rate[], sort: RateSort) => [...rates].sort(sort === 'PRICE' ? byPrice : byTime)

/**
 * Cheapest, Fastest and Best value (lowest price × days among the rest), worked out on the client once the list
 * is complete. Tags the server already set win.
 */
export function tagRates(rates: Rate[]): Rate[] {
  if (rates.length === 0 || rates.some((rate) => rate.tags.length > 0)) return rates
  const cheapest = [...rates].sort(byPrice)[0]
  const timed = rates.filter((rate) => Number.isFinite(days(rate)))
  const fastest = timed.length ? [...timed].sort(byTime)[0] : null
  const value = timed
    .filter((rate) => rate !== cheapest && rate !== fastest)
    .sort((a, b) => a.total * days(a) - b.total * days(b))[0]
  const tags = new Map<Rate, RateTag[]>()
  const add = (rate: Rate | null | undefined, tag: RateTag) => rate && tags.set(rate, [...(tags.get(rate) ?? []), tag])
  add(cheapest, 'CHEAPEST')
  add(fastest, 'FASTEST')
  add(value, 'BEST_VALUE')
  return rates.map((rate) => (tags.has(rate) ? { ...rate, tags: tags.get(rate) ?? [] } : rate))
}
