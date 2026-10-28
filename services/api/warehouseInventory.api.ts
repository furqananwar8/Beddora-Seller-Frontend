import { baseApi } from './baseApi'
import { Page } from './finance.api'

/** Available-stock columns, in screen order; together they make the total available units. */
export type StockColumn = 'canada' | 'usa' | 'thirdParty' | 'own' | 'returns' | 'damaged'
export type StockFilter = 'all' | 'in-stock' | 'out-of-stock'

export interface WarehouseInventoryRow {
  product: { id: number; sku: string; name: string; upc: string | null }
  asins: string[]
  /** Units per column; null while that stock is not kept yet. */
  stock: Record<StockColumn, number | null>
  totalAvailable: number
  inTransit: number
  totalPipeline: number
  /** COGS landed cost of one unit. */
  landedCost: { cad: number; usd: number }
  /** Pipeline units at the CAD landed cost. */
  costCad: number
}

export interface WarehouseInventoryReport extends Page<WarehouseInventoryRow> {
  asOf: string
  tracked: Record<StockColumn, boolean>
}

export interface WarehouseInventoryParams {
  /** YYYY-MM-DD; today when left out. */
  asOf?: string
  stock: StockFilter
  search?: string
  page: number
  limit: number
}

export const warehouseInventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouseInventory: builder.query<WarehouseInventoryReport, WarehouseInventoryParams>({
      query: ({ search, asOf, ...rest }) => ({ url: '/inventory/warehouse-inventory', params: { ...rest, asOf: asOf || undefined, search: search || undefined } }),
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetWarehouseInventoryQuery } = warehouseInventoryApi
