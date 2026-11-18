import { baseApi } from './baseApi'
import { Page } from './finance.api'
import type { BucketBalances, StockBucket } from './inventoryPlanner.api'

export interface StockCountRow {
  id: string
  sku: string
  description: string
  /** YYYY-MM-DD the quantities are as of. */
  asOf: string
  /** What the ledger says the warehouse held at the end of that day. */
  systemOnHand: number
  /** Units that entered and left the warehouse after that day; a count is net of them. */
  movedSince: { in: number; out: number }
  /** On hand today. */
  currentOnHand: number
  /** Lowest on hand today; units held by FBA shipments can't be removed. */
  minimum: number
  balances: BucketBalances
}

export interface StockCountHistoryEntry {
  id: number
  /** YYYY-MM-DD counted. */
  day: string
  systemQuantity: number
  countedQuantity: number
  variance: number
  note: string | null
  /** Who saved it. */
  by: string | null
  createdAt: string
}

export interface StockCountParams {
  /** YYYY-MM-DD, today or earlier; today when left out. */
  asOf?: string
  search?: string
  page: number
  limit: number
}

export interface SaveStockCountRequest {
  id: string
  asOf: string
  counted: number
  /** The system quantity the user saw; a mismatch means stock moved since. */
  expectedSystem: number
  note?: string
}

export interface SaveStockCountResponse {
  row: StockCountRow
  changedBuckets: StockBucket[]
}

export const stockCountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStockCounts: builder.query<Page<StockCountRow>, StockCountParams>({
      query: ({ asOf, search, ...rest }) => ({ url: '/inventory/stock-count', params: { ...rest, asOf: asOf || undefined, search: search || undefined } }),
      providesTags: ['InventoryAdjustments'],
    }),

    getStockCountHistory: builder.query<StockCountHistoryEntry[], string>({
      query: (id) => `/inventory/stock-count/${id}/history`,
      transformResponse: (response: { data: StockCountHistoryEntry[] }) => response.data,
      providesTags: ['InventoryAdjustments'],
    }),

    saveStockCount: builder.mutation<SaveStockCountResponse, SaveStockCountRequest>({
      query: ({ id, ...body }) => ({ url: `/inventory/stock-count/${id}`, method: 'POST', body }),
      transformResponse: (response: { data: SaveStockCountResponse }) => response.data,
      // Warehouse Inventory, Channel INVP and the planner all read the ledger a count writes to
      invalidatesTags: ['InventoryAdjustments', 'Inventory'],
    }),
  }),
})

export const { useGetStockCountsQuery, useGetStockCountHistoryQuery, useSaveStockCountMutation } = stockCountApi
