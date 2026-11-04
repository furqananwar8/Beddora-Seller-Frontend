import { formatCurrency } from '@/utils/format'
import type { DayMetrics } from '@/types/campaignPerformance.types'

/**
 * The figures stacked in a day cell. One list drives the legend above the grid, the label column, the lines of each
 * cell and the hover text, so adding a figure is one entry here.
 */
export interface MetricColumn {
  key: string
  label: string
  /** Hover text when the label alone does not say what the figure is (derived figures). */
  description?: string
  /** Text colour (Tailwind) of the figure in the cell and of its legend label. */
  tone: string
  /** The figure for a day, or null when there is nothing to show. */
  read: (metrics: DayMetrics) => number | null
  format: (value: number) => string
}

const money = (value: number) => formatCurrency(value, 'USD').replace('$', '$ ')
const whole = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
const percent = (value: number) => `${value.toFixed(1)}%`

const field =
  (key: keyof DayMetrics) =>
  (metrics: DayMetrics): number | null =>
    metrics[key]

/** `part` as a percentage of `whole`; nothing to show when either is missing or the whole is zero. */
const ratio =
  (part: keyof DayMetrics, base: keyof DayMetrics) =>
  (metrics: DayMetrics): number | null => {
    const top = metrics[part]
    const bottom = metrics[base]
    return top == null || bottom == null || bottom <= 0 ? null : (top / bottom) * 100
  }

export const METRIC_COLUMNS: readonly MetricColumn[] = [
  { key: 'budget', label: 'Budget', tone: 'text-blue-600', read: field('budget'), format: money },
  { key: 'spend', label: 'Spend', tone: 'text-red-600', read: field('spend'), format: money },
  { key: 'actualSales', label: 'Actual Sales', tone: 'text-emerald-700', read: field('actualSales'), format: money },
  { key: 'units', label: 'Units', tone: 'text-slate-700', read: field('units'), format: whole },
  { key: 'ppcSales', label: 'PPC Sales', tone: 'text-orange-600', read: field('ppcSales'), format: money },
  { key: 'ppcUnits', label: 'PPC Units', tone: 'text-amber-700', read: field('ppcUnits'), format: whole },
  { key: 'price', label: 'Price', tone: 'text-violet-700', read: field('price'), format: money },
  { key: 'acos', label: 'ACOS', description: 'ACOS: Spend / PPC Sales', tone: 'text-pink-700', read: ratio('spend', 'ppcSales'), format: percent },
  { key: 'tacos', label: 'TACOS', description: 'TACOS: Spend / Actual Sales', tone: 'text-cyan-700', read: ratio('spend', 'actualSales'), format: percent },
]
