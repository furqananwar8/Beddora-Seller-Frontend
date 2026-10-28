import { Container, type LucideIcon, Store, Warehouse } from 'lucide-react'
import { endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns'
import type { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import type { FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import { STATUS_TONE } from '@/utils/statusTones'
import type { InvpChannel, InvpGrouping, InvpLine, InvpMarketplace, InvpView, StockLevel } from '@/services/api/channelInvp.api'

/** Same cap as the server: about three months back. */
export const MAX_LOOKBACK_DAYS = 92

const day = (date: Date) => format(date, 'yyyy-MM-dd')
const today = () => new Date()
const lastDays = (days: number) => () => ({ startDate: day(subDays(today(), days - 1)), endDate: day(today()) })

/** The earliest day the picker offers. */
export const earliestDay = () => subDays(today(), MAX_LOOKBACK_DAYS)

export const INVP_PRESETS: DateRangePreset[] = [
  { id: 'last-7-days', label: 'Last 7 days', getRange: lastDays(7) },
  { id: 'last-30-days', label: 'Last 30 days', getRange: lastDays(30) },
  { id: 'this-month', label: 'This month', getRange: () => ({ startDate: day(startOfMonth(today())), endDate: day(today()) }) },
  {
    id: 'last-month',
    label: 'Last month',
    getRange: () => {
      const last = subMonths(today(), 1)
      return { startDate: day(startOfMonth(last)), endDate: day(endOfMonth(last)) }
    },
  },
  { id: 'last-90-days', label: 'Last 90 days', getRange: lastDays(90) },
]

export const CHANNEL_OPTIONS: Array<SegmentedOption<InvpChannel>> = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'temu', label: 'Temu' },
]

export const CHANNEL_LABEL: Record<InvpChannel, string> = { amazon: 'Amazon', shopify: 'Shopify', walmart: 'Walmart', temu: 'Temu' }

export const MARKETPLACE_META: Record<InvpMarketplace, { label: string }> = {
  CA: { label: 'Canada' },
  US: { label: 'USA' },
  MX: { label: 'Mexico' },
}

export const MARKETPLACE_OPTIONS: Array<FilterOption<InvpMarketplace>> = (Object.keys(MARKETPLACE_META) as InvpMarketplace[]).map((code) => ({
  value: code,
  label: MARKETPLACE_META[code].label,
}))

export const GROUPING_OPTIONS: Array<SegmentedOption<InvpGrouping>> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export const VIEW_OPTIONS: Array<SegmentedOption<InvpView>> = [
  { value: 'count', label: 'Count' },
  { value: 'amount', label: 'Amount' },
]

export const LINES: InvpLine[] = ['warehouse', 'container', 'channel']

export const lineLabel = (line: InvpLine, channel: InvpChannel) => (line === 'warehouse' ? 'Warehouse' : line === 'container' ? 'Container' : CHANNEL_LABEL[channel])

/** Each stock line's icon in the table. */
export const LINE_ICON: Record<InvpLine, LucideIcon> = { warehouse: Warehouse, container: Container, channel: Store }

/** Stock levels by days of cover, as the legend explains them. */
export const LEVEL_META: Record<StockLevel, { label: string; cell: string; swatch: string }> = {
  LOW: { label: 'Low in stock', ...STATUS_TONE.green },
  MID: { label: 'Mid in stock', ...STATUS_TONE.yellow },
  HIGH: { label: 'Much stock, has to be sold', ...STATUS_TONE.red },
}

export const LEVELS: StockLevel[] = ['LOW', 'MID', 'HIGH']

export interface InvpFilters extends Record<string, unknown> {
  channel: InvpChannel
  search: string
  marketplaces: InvpMarketplace[]
  range: DateRangeValue
  groupBy: InvpGrouping
  view: InvpView
}

export const defaultFilters = (): InvpFilters => ({
  channel: 'amazon',
  search: '',
  marketplaces: [],
  range: { ...INVP_PRESETS[1].getRange(), presetId: INVP_PRESETS[1].id },
  groupBy: 'day',
  view: 'count',
})

/** A range kept inside the last three months and not past today. */
export function withinLookback(range: DateRangeValue): DateRangeValue {
  if (!range.startDate || !range.endDate) return range
  const earliest = day(earliestDay())
  const latest = day(today())
  const startDate = range.startDate < earliest ? earliest : range.startDate
  const endDate = range.endDate > latest ? latest : range.endDate
  return startDate === range.startDate && endDate === range.endDate ? range : { ...range, startDate, endDate, presetId: null }
}
