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

export const inventoryAdjustmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdjustments: builder.query<AdjustmentRow[], string | void>({
      query: (search) => ({ url: '/inventory/adjustments', params: search ? { search } : undefined }),
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

export const { useGetAdjustmentsQuery, useAdjustQuantityMutation, useUpdateBoxDimensionsMutation } = inventoryAdjustmentsApi
