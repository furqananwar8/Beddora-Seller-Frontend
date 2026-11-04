import { formatCurrency } from '@/utils/format'
import type { DayMetrics } from '@/types/campaignPerformance.types'

/**
 * The figures stacked in a day cell. One list drives the legend above the grid, the lines of each cell and the hover
 * text, so adding a figure is one entry here.
 */
export interface MetricColumn {
  key: keyof DayMetrics
  label: string
  /** Text colour (Tailwind) of the figure in the cell and of its legend label. */
  tone: string
  format: (value: number) => string
}

const money = (value: number) => formatCurrency(value, 'USD').replace('$', '$ ')
const whole = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)

export const METRIC_COLUMNS: readonly MetricColumn[] = [
  { key: 'budget', label: 'Budget', tone: 'text-blue-600', format: money },
  { key: 'spend', label: 'Spend', tone: 'text-red-600', format: money },
  { key: 'actualSales', label: 'Actual Sales', tone: 'text-emerald-700', format: money },
  { key: 'units', label: 'Units', tone: 'text-slate-700', format: whole },
  { key: 'ppcSales', label: 'PPC Sales', tone: 'text-orange-600', format: money },
  { key: 'ppcUnits', label: 'PPC Units', tone: 'text-amber-700', format: whole },
  { key: 'price', label: 'Price', tone: 'text-violet-700', format: money },
]
