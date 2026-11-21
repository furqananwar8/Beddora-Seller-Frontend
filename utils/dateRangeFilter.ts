import { endOfDay, format, parseISO, startOfDay, startOfMonth, subDays } from 'date-fns'
import type { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

const day = (date: Date) => format(date, 'yyyy-MM-dd')

/** Presets for list filters; "All time" clears the range, "Custom" keeps the picker open for Apply. */
export const LIST_DATE_PRESETS: DateRangePreset[] = [
  { id: 'today', label: 'Today', getRange: () => ({ startDate: day(new Date()), endDate: day(new Date()) }) },
  { id: 'yesterday', label: 'Yesterday', getRange: () => ({ startDate: day(subDays(new Date(), 1)), endDate: day(subDays(new Date(), 1)) }) },
  { id: 'last7', label: 'Last 7 days', getRange: () => ({ startDate: day(subDays(new Date(), 6)), endDate: day(new Date()) }) },
  { id: 'thisMonth', label: 'This Month', getRange: () => ({ startDate: day(startOfMonth(new Date())), endDate: day(new Date()) }) },
  { id: 'all', label: 'All time', getRange: () => ({ startDate: '', endDate: '' }) },
  { id: 'custom', label: 'Custom', getRange: () => ({ startDate: day(startOfMonth(new Date())), endDate: day(new Date()) }) },
]

export const ANY_DATE: DateRangeValue = { startDate: null, endDate: null, presetId: null }

/** Whole-day ISO bounds for the API; no range sends none. */
export function dateBounds(range: DateRangeValue): { from?: string; to?: string } {
  if (!range.startDate || !range.endDate) return {}
  return { from: startOfDay(parseISO(range.startDate)).toISOString(), to: endOfDay(parseISO(range.endDate)).toISOString() }
}
