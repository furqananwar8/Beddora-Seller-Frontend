import { baseApi } from './baseApi'
import { Page } from './finance.api'

export type AgingMarketplace = 'CA' | 'US' | 'MX'
/** Every SKU, or only those holding units older than 180 or 365 days. */
export type AgeFilter = 'all' | 'over-180' | 'over-365'
export type AgeBucketKey = 'invAge0To90Days' | 'invAge91To180Days' | 'invAge181To270Days' | 'invAge271To365Days' | 'invAge365PlusDays'

export interface InventoryAgingRow {
  sellerSku: string
  fnSku: string | null
  asin: string
  productName: string | null
  available: number
  /** Held for orders, FC transfers or processing: in the age buckets but not in `available`. Null on older snapshots. */
  reserved: number | null
  /** Units per age bucket; null when Amazon's report did not give that bucket. */
  ages: Record<AgeBucketKey, number | null>
}

export interface InventoryAgingReport extends Page<InventoryAgingRow> {
  /** The Amazon snapshot shown (the latest for the marketplace); null before the first sync. */
  snapshotDate: string | null
  /** The age columns in display order, as the server buckets them. */
  buckets: Array<{ key: AgeBucketKey; label: string }>
  /** Units per bucket over every SKU matching the filters, not only this page. */
  totals: Record<AgeBucketKey, number> & { available: number; reserved: number }
}

/** Columns the server can order by, highest first (`desc`) or lowest first (`asc`). */
export type AgingSortColumn = 'available' | 'reserved' | AgeBucketKey
export type SortOrder = 'asc' | 'desc'

export interface InventoryAgingParams {
  marketplace: AgingMarketplace
  age: AgeFilter
  search?: string
  sortBy?: AgingSortColumn
  sortOrder?: SortOrder
  page: number
  limit: number
}

export const inventoryAgingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryAging: builder.query<InventoryAgingReport, InventoryAgingParams>({
      query: ({ search, ...rest }) => ({ url: '/inventory/inventory-aging', params: { ...rest, search: search || undefined } }),
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetInventoryAgingQuery } = inventoryAgingApi
