import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import type { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import type { FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import type { CashflowGrouping, CashflowPaymentFilter } from '@/services/api/finance.api'
import { CURRENCIES, currencyOptions } from '../shared/currency'

/** Same cap as the server: two months of days stays readable. */
export const MAX_RANGE_DAYS = 62

const day = (date: Date) => format(date, 'yyyy-MM-dd')

const lastDays = (days: number) => () => ({ startDate: day(subDays(new Date(), days - 1)), endDate: day(new Date()) })

export const CASHFLOW_PRESETS: DateRangePreset[] = [
  { id: 'this-month', label: 'This month', getRange: () => ({ startDate: day(startOfMonth(new Date())), endDate: day(endOfMonth(new Date())) }) },
  {
    id: 'last-month',
    label: 'Last month',
    getRange: () => {
      const last = subMonths(new Date(), 1)
      return { startDate: day(startOfMonth(last)), endDate: day(endOfMonth(last)) }
    },
  },
  { id: 'last-45-days', label: 'Last 45 days', getRange: lastDays(45) },
  { id: 'last-60-days', label: 'Last 60 days', getRange: lastDays(60) },
]

export const GROUPING_OPTIONS: Array<SegmentedOption<CashflowGrouping>> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export const CURRENCY_OPTIONS: FilterOption[] = currencyOptions()

/** '' is both. */
export type PaymentChoice = CashflowPaymentFilter | ''

export const PAYMENT_OPTIONS: Array<SegmentedOption<PaymentChoice>> = [
  { value: '', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
]

export interface CashflowFilters extends Record<string, unknown> {
  range: DateRangeValue
  groupBy: CashflowGrouping
  currencies: string[]
  payment: PaymentChoice
}

export const defaultFilters = (): CashflowFilters => ({
  range: { ...CASHFLOW_PRESETS[0].getRange(), presetId: CASHFLOW_PRESETS[0].id },
  groupBy: 'day',
  currencies: [],
  payment: '',
})

const GROUPINGS: CashflowGrouping[] = ['day', 'week', 'month']
const isDay = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))

/**
 * The applied filters as the page address keeps them (`?from=&to=&groupBy=&currencies=&payment=`), so leaving for a
 * payment's details and coming back opens the grid as it was. Anything missing or malformed keeps its default.
 */
export function filtersFromParams(params: URLSearchParams): CashflowFilters {
  const defaults = defaultFilters()
  const from = params.get('from')
  const to = params.get('to')
  const groupBy = params.get('groupBy') as CashflowGrouping | null
  const payment = params.get('payment')
  return {
    range: isDay(from) && isDay(to) ? withinCap({ startDate: from, endDate: to, presetId: params.get('preset') }) : defaults.range,
    groupBy: groupBy && GROUPINGS.includes(groupBy) ? groupBy : defaults.groupBy,
    currencies: (params.get('currencies') ?? '').split(',').filter((code) => (CURRENCIES as readonly string[]).includes(code)),
    payment: payment === 'PAID' || payment === 'UNPAID' ? payment : '',
  }
}

export function filtersToParams({ range, groupBy, currencies, payment }: CashflowFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (range.startDate) params.set('from', range.startDate)
  if (range.endDate) params.set('to', range.endDate)
  if (range.presetId) params.set('preset', range.presetId)
  params.set('groupBy', groupBy)
  if (currencies.length) params.set('currencies', currencies.join(','))
  if (payment) params.set('payment', payment)
  return params
}

/** Days a range covers, both ends included. */
export const rangeDays = ({ startDate, endDate }: DateRangeValue): number =>
  startDate && endDate ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1 : 0

/** A range kept within two months: a longer pick ends two months after its start. */
export function withinCap(range: DateRangeValue): DateRangeValue {
  if (!range.startDate || rangeDays(range) <= MAX_RANGE_DAYS) return range
  return { ...range, endDate: day(subDays(parseISO(range.startDate), -(MAX_RANGE_DAYS - 1))), presetId: null }
}
