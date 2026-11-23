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
  /** Samples received for this SKU: information only, never part of stock, pipeline or cost. */
  samples: number
}

export interface WarehouseInventoryReport extends Page<WarehouseInventoryRow> {
  asOf: string
  tracked: Record<StockColumn, boolean>
}

/** One time damaged or returned units were added for a SKU, and the screen they were scanned on. */
export interface WarehouseEntry {
  id: string
  at: string
  units: number
  screen: string
  ref: string | null
  direction: 'IN' | 'OUT' | null
  session: string | null
  /** The scan session's id, for opening its details. */
  sessionId: number | null
  /** A damaged return is in both histories: which other history lists the same unit. */
  linked: 'return' | 'damaged' | null
  /** The record behind the entry (container, shipment or order), for opening it. */
  record: { type: 'container' | 'shipment' | 'order'; id: string } | null
  by: string | null
  note: string | null
}

export type WarehouseEntryKind = 'units' | 'damaged' | 'return'

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
    getWarehouseEntries: builder.query<WarehouseEntry[], { productId: number; kind: WarehouseEntryKind }>({
      query: ({ productId, kind }) => ({ url: `/inventory/warehouse-inventory/${productId}/entries`, params: { kind } }),
      transformResponse: (response: { data: WarehouseEntry[] }) => response.data,
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetWarehouseInventoryQuery, useGetWarehouseEntriesQuery } = warehouseInventoryApi
