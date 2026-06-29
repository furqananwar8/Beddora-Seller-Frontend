import { baseApi } from './baseApi'
import { InventoryKpiFilters, InventoryKpiResponse } from '@/types/inventoryKpis.types'

export const inventoryKpisApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryKpis: builder.query<InventoryKpiResponse, InventoryKpiFilters>({
      query: (filters) => ({
        url: '/inventory/kpis',
        params: filters,
      }),
      providesTags: ['InventoryKpis'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryKpiResponse }) => response.data,
    }),
    getInventoryKpiBySKU: builder.query<
      InventoryKpiResponse,
      { sku: string; accountId: string; marketplaceId?: string }
    >({
      query: ({ sku, ...params }) => ({
        url: `/inventory/kpis/${sku}`,
        params,
      }),
      providesTags: (result, error, { sku }) => [{ type: 'InventoryKpis', id: sku }],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryKpiResponse }) => response.data,
    }),
    recalculateInventoryKpis: builder.mutation<InventoryKpiResponse, InventoryKpiFilters>({
      query: (payload) => ({
        url: '/inventory/kpis/calculate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['InventoryKpis'],
      transformResponse: (response: { success: boolean; data: InventoryKpiResponse }) => response.data,
    }),
  }),
})

export const {
  useGetInventoryKpisQuery,
  useGetInventoryKpiBySKUQuery,
  useRecalculateInventoryKpisMutation,
} = inventoryKpisApi

