import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

/* ----------------------------- types ----------------------------- */

export type ComparisonKey = 'today' | 'yesterday' | 'lastWeek' | 'lastYear'

export interface Comparison {
  key: ComparisonKey
  label: string
  color: string
  startDate: string
  endDate: string
  units: number
  sales: number
  avgUnits: number
  avgSales: number
  orderItems: number
  adSpend: number
}

export interface HourlyPoint {
  hour: string
  today: number
  yesterday: number
  lastWeek: number
  lastYear: number
}

export interface PartialTotals {
  orderItems: number
  units: number
  sales: number
  avgUnits: number
  avgSales: number
}

/** Lines of the comparison, in display order. */
export const PERIODS: { key: ComparisonKey; label: string; color: string }[] = [
  { key: 'today', label: 'Current period', color: '#0891b2' },
  { key: 'yesterday', label: 'Previous period', color: '#ef3b12' },
  { key: 'lastWeek', label: 'Same period last week', color: '#f59e0b' },
  { key: 'lastYear', label: 'Same period last year', color: '#7c8b8f' },
]

/* ----------------------------- dates ----------------------------- */

const formatDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const rangeOf = (start: Date, end: Date): DateRangeValue => ({
  startDate: formatDate(start),
  endDate: formatDate(end),
})

export const getTodayRange = (): DateRangeValue => rangeOf(new Date(), new Date())

export const getYesterdayRange = (): DateRangeValue => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return rangeOf(d, d)
}

export const getWeekToDateRange = (): DateRangeValue => {
  const today = new Date()
  const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1
  const start = new Date(today)
  start.setDate(start.getDate() - daysFromMonday)
  return rangeOf(start, today)
}

export const getMonthToDateRange = (): DateRangeValue => {
  const today = new Date()
  return rangeOf(new Date(today.getFullYear(), today.getMonth(), 1), today)
}

export const getYearToDateRange = (): DateRangeValue => {
  const today = new Date()
  return rangeOf(new Date(today.getFullYear(), 0, 1), today)
}

/* --------------------------- formatters --------------------------- */

/** Currency symbol, a space, then the amount: 'CA$ 837.71', '$ 375.90'. */
export const formatMoney = (value: number, currency: string): string => {
  const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(value)
  const symbol = parts.filter((p) => p.type === 'currency').map((p) => p.value).join('')
  const amount = parts.filter((p) => p.type !== 'currency').map((p) => p.value).join('').trim()
  return `${symbol} ${amount}`
}

export const formatPercent = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

export const percentChange = (current: number, previous: number): number =>
  previous ? ((current - previous) / previous) * 100 : 0

/* ------------------------ hourly skeleton ------------------------ */

const HOUR_LABELS = [
  '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM',
  '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM',
  '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM',
]

/** 24h zero series so chart axes never collapse before data arrives. */
export const DEFAULT_HOURLY: HourlyPoint[] = HOUR_LABELS.map((hour) => ({
  hour,
  today: 0,
  yesterday: 0,
  lastWeek: 0,
  lastYear: 0,
}))

/** Totals of one comparison from midnight through the given hour (inclusive). */
export function partialTotals(
  key: ComparisonKey,
  throughHour: number,
  hourly: { units: HourlyPoint[]; sales: HourlyPoint[]; orderItems: HourlyPoint[] }
): PartialTotals {
  let units = 0
  let sales = 0
  let orderItems = 0
  for (let i = 0; i <= throughHour && i < 24; i++) {
    units += hourly.units[i]?.[key] ?? 0
    sales += hourly.sales[i]?.[key] ?? 0
    orderItems += hourly.orderItems[i]?.[key] ?? 0
  }
  return {
    orderItems,
    units,
    sales,
    avgUnits: orderItems > 0 ? units / orderItems : 0,
    avgSales: orderItems > 0 ? sales / orderItems : 0,
  }
}

/* --------------------------- hourly detail --------------------------- */

export interface HourlyDetail {
  orderItems: number
  units: number
  sales: number
}

/** Hour label -> period key -> counts, so one hover can show orders, units and sales together. */
export type HourlyDetailMap = Record<string, Partial<Record<ComparisonKey, HourlyDetail>>>

export function buildHourlyDetail(hourly: {
  units: HourlyPoint[]
  sales: HourlyPoint[]
  orderItems: HourlyPoint[]
}): HourlyDetailMap {
  const map: HourlyDetailMap = {}
  hourly.units.forEach((point, i) => {
    const entry: HourlyDetailMap[string] = {}
    for (const { key } of PERIODS) {
      entry[key] = {
        orderItems: hourly.orderItems[i]?.[key] ?? 0,
        units: point[key] ?? 0,
        sales: hourly.sales[i]?.[key] ?? 0,
      }
    }
    map[point.hour] = entry
  })
  return map
}

/** 'Oct 13, 2026' for a day, 'Oct 1 – Oct 13, 2026' for a range (dates are yyyy-MM-dd). */
export function formatPeriodDates(startDate?: string, endDate?: string): string {
  if (!startDate) return ''
  const fmt = (d: string, withYear: boolean) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      ...(withYear && { year: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(`${d}T00:00:00Z`))
  if (!endDate || endDate === startDate) return fmt(startDate, true)
  return `${fmt(startDate, false)} – ${fmt(endDate, true)}`
}
