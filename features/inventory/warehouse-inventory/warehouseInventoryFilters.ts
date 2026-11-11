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

const stock = (source: StockColumn, label: string, group: string): FigureColumn => ({ key: `${group}:${source}`, label, group, source, value: (row) => row.stock[source] })

const OUR_WAREHOUSE = 'Our Warehouse'
const THIRD_PARTY = '3PL'
const PLATFORM_INVENTORY = 'Platform Inventory'

/**
 * The column layout: where the stock sits (our own warehouse, the 3PL, the sales platforms), then the total
 * available and what is on its way. The two totals have no group, so their header spans both header rows.
 */
export const FIGURE_COLUMNS: FigureColumn[] = [
  stock('own', 'Canada', OUR_WAREHOUSE),
  stock('returns', 'Return', OUR_WAREHOUSE),
  stock('damaged', 'Damaged', OUR_WAREHOUSE),
  stock('thirdParty', 'USA', THIRD_PARTY),
  stock('canada', 'Canada', PLATFORM_INVENTORY),
  stock('usa', 'USA', PLATFORM_INVENTORY),
  { key: 'totalAvailable', label: 'Total available units', value: (row) => row.totalAvailable, strong: true },
  { key: 'inTransit', label: 'Intransit', value: (row) => row.inTransit },
]

export { headerGroups } from '@/utils/headerGroups'
