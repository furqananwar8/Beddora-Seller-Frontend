import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import type { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import type { FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import type { CashflowGrouping } from '@/services/api/finance.api'

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

export const CURRENCY_OPTIONS: FilterOption[] = ['CAD', 'USD', 'MXN'].map((code) => ({ value: code, label: code }))

export interface CashflowFilters extends Record<string, unknown> {
  range: DateRangeValue
  groupBy: CashflowGrouping
  currencies: string[]
}

export const defaultFilters = (): CashflowFilters => ({ range: { ...CASHFLOW_PRESETS[0].getRange(), presetId: CASHFLOW_PRESETS[0].id }, groupBy: 'day', currencies: [] })

/** Days a range covers, both ends included. */
export const rangeDays = ({ startDate, endDate }: DateRangeValue): number =>
  startDate && endDate ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1 : 0

/** A range kept within two months: a longer pick ends two months after its start. */
export function withinCap(range: DateRangeValue): DateRangeValue {
  if (!range.startDate || rangeDays(range) <= MAX_RANGE_DAYS) return range
  return { ...range, endDate: day(subDays(parseISO(range.startDate), -(MAX_RANGE_DAYS - 1))), presetId: null }
}
