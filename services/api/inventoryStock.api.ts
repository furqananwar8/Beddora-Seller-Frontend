import { baseApi } from './baseApi'
import {
  InventoryStockAlertsResponse,
  InventoryStockFilters,
  InventoryStockResponse,
  UpdateInventoryRequest,
  InventoryStockItem,
} from '@/types/inventoryStock.types'

export const inventoryStockApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryStock: builder.query<InventoryStockResponse, InventoryStockFilters>({
      query: (filters) => ({
        url: '/inventory',
        params: filters,
      }),
      providesTags: ['Inventory'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryStockResponse }) => response.data,
    }),
    getInventoryStockBySKU: builder.query<
      InventoryStockResponse,
      { sku: string; accountId: string; marketplaceId?: string }
    >({
      query: ({ sku, ...params }) => ({
        url: `/inventory/${sku}`,
        params,
      }),
      providesTags: (result, error, { sku }) => [{ type: 'Inventory', id: sku }],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryStockResponse }) => response.data,
    }),
    updateInventoryStock: builder.mutation<
      InventoryStockItem,
      { sku: string; payload: UpdateInventoryRequest }
    >({
      query: ({ sku, payload }) => ({
        url: `/inventory/${sku}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, { sku }) => [{ type: 'Inventory', id: sku }, 'Inventory'],
      transformResponse: (response: { success: boolean; data: InventoryStockItem }) => response.data,
    }),
    getLowStockAlerts: builder.query<
      InventoryStockAlertsResponse,
      { accountId: string; marketplaceId?: string; sku?: string }
    >({
      query: (params) => ({
        url: '/inventory/alerts',
        params,
      }),
      providesTags: ['Inventory'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryStockAlertsResponse }) => response.data,
    }),
  }),
})

export const {
  useGetInventoryStockQuery,
  useGetInventoryStockBySKUQuery,
  useUpdateInventoryStockMutation,
  useGetLowStockAlertsQuery,
} = inventoryStockApi

