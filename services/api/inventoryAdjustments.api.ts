import { baseApi } from './baseApi'
import type { BucketBalances, StockBucket } from './inventoryPlanner.api'

export type DimensionUnit = 'IN' | 'CM'
export type WeightUnit = 'LB' | 'KG'

/** How a SKU ships in cartons; the same shape shipments use for case packs. */
export interface BoxDimensions {
  unitsPerBox: number
  length: number
  width: number
  height: number
  dimensionUnit: DimensionUnit
  weight: number
  weightUnit: WeightUnit
}

export interface AdjustmentRow {
  id: string
  sku: string
  description: string
  onHand: number
  /** Lowest quantity that can be set; units held by FBA shipments can't be removed. */
  minimum: number
  balances: BucketBalances
  boxDimensions: BoxDimensions | null
}

export interface AdjustmentListParams {
  search?: string
  page: number
  limit: number
}

export interface AdjustmentPage {
  success: boolean
  data: AdjustmentRow[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export interface AdjustQuantityRequest {
  id: string
  quantity: number
  expectedOnHand: number
  note?: string
}

export interface AdjustQuantityResponse {
  row: AdjustmentRow
  changedBuckets: StockBucket[]
}

export interface AdjustmentHistoryEntry {
  id: number
  sku: string
  description: string
  /** Bucket the units left (null: they entered the warehouse) and bucket they went to (null: they left it). */
  fromBucket: StockBucket | null
  toBucket: StockBucket | null
  quantity: number
  note: string | null
  user: { id: number; name: string | null } | null
  createdAt: string
}

export interface AdjustmentHistoryParams {
  /** One SKU's history; every SKU when absent. */
  id?: string
  page: number
  limit: number
}

export interface AdjustmentHistoryPage {
  data: AdjustmentHistoryEntry[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export const inventoryAdjustmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdjustments: builder.query<AdjustmentPage, AdjustmentListParams>({
      query: ({ search, page, limit }) => ({ url: '/inventory/adjustments', params: { search: search || undefined, page, limit } }),
      providesTags: ['InventoryAdjustments'],
    }),

    getAdjustmentHistory: builder.query<AdjustmentHistoryPage, AdjustmentHistoryParams>({
      query: ({ id, page, limit }) => ({ url: `/inventory/adjustments/${id ? `${id}/` : ''}history`, params: { page, limit } }),
      providesTags: ['InventoryAdjustments'],
    }),

    adjustQuantity: builder.mutation<AdjustQuantityResponse, AdjustQuantityRequest>({
      query: ({ id, ...body }) => ({ url: `/inventory/adjustments/${id}/quantity`, method: 'POST', body }),
      invalidatesTags: ['InventoryAdjustments', 'Inventory'],
    }),

    updateBoxDimensions: builder.mutation<AdjustmentRow, { id: string; box: BoxDimensions }>({
      query: ({ id, box }) => ({ url: `/inventory/adjustments/${id}/box-dimensions`, method: 'PUT', body: box }),
      invalidatesTags: ['InventoryAdjustments'],
    }),
  }),
})

export const { useGetAdjustmentsQuery, useGetAdjustmentHistoryQuery, useAdjustQuantityMutation, useUpdateBoxDimensionsMutation } = inventoryAdjustmentsApi
