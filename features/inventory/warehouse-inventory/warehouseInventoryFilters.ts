import { format } from 'date-fns'
import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import type { StockColumn, StockFilter, WarehouseInventoryRow } from '@/services/api/warehouseInventory.api'
import { earliestDay } from '../channel-invp/invpFilters'

export const STOCK_OPTIONS: Array<SegmentedOption<StockFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'out-of-stock', label: 'Out Of Stock' },
]

const day = (date: Date) => format(date, 'yyyy-MM-dd')
export const todayDay = () => day(new Date())
/** Same lookback as Channel INVP: the server rolls stock back at most three months. */
export const earliestAsOf = () => day(earliestDay())

export interface WarehouseInventoryFilters extends Record<string, unknown> {
  search: string
  asOf: string
  stock: StockFilter
}

export const defaultFilters = (): WarehouseInventoryFilters => ({ search: '', asOf: todayDay(), stock: 'all' })

/** One figure column of the table; the order here is the order on screen. */
export interface FigureColumn {
  key: string
  label: string
  /** Shown above the column, spanning the columns that share it. */
  group?: string
  value: (row: WarehouseInventoryRow) => number | null
  /** The stock column it reads, so an untracked one can say so. */
  source?: StockColumn
  money?: 'CAD' | 'USD'
  strong?: boolean
}

const stock = (source: StockColumn, label: string): FigureColumn => ({ key: source, label, source, value: (row) => row.stock[source] })

/** Every figure sits under one shared "Platforms inventory" heading. */
const PLATFORMS_INVENTORY = 'Platforms inventory'

export const FIGURE_COLUMNS: FigureColumn[] = ([
  stock('canada', 'Canada'),
  stock('usa', 'USA'),
  stock('thirdParty', '3PL warehouse'),
  stock('own', 'Own'),
  stock('returns', 'Return'),
  stock('damaged', 'Damaged'),
  { key: 'totalAvailable', label: 'Total available units', value: (row) => row.totalAvailable, strong: true },
  { key: 'inTransit', label: 'In-transit (container)', value: (row) => row.inTransit },
  { key: 'totalPipeline', label: 'Total pipeline inventory', value: (row) => row.totalPipeline, strong: true },
  { key: 'costCad', label: 'Cost (CAD)', money: 'CAD', value: (row) => row.costCad, strong: true },
] satisfies FigureColumn[]).map((column) => ({ ...column, group: PLATFORMS_INVENTORY }))

export { headerGroups } from '@/utils/headerGroups'
