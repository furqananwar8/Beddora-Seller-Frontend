import { baseApi } from './baseApi'
import {
  InventoryForecastAlertsResponse,
  InventoryForecastFilters,
  InventoryForecastResponse,
  UpdateForecastRequest,
  InventoryForecastItem,
} from '@/types/inventoryForecast.types'

export const inventoryForecastApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getForecasts: builder.query<InventoryForecastResponse, InventoryForecastFilters>({
      query: (filters) => ({
        url: '/inventory/forecast',
        params: filters,
      }),
      providesTags: ['InventoryForecast'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryForecastResponse }) => response.data,
    }),
    getForecastBySKU: builder.query<
      InventoryForecastResponse,
      { sku: string; accountId: string; marketplaceId?: string }
    >({
      query: ({ sku, ...params }) => ({
        url: `/inventory/forecast/${sku}`,
        params,
      }),
      providesTags: (result, error, { sku }) => [{ type: 'InventoryForecast', id: sku }],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryForecastResponse }) => response.data,
    }),
    updateForecast: builder.mutation<
      InventoryForecastItem,
      { sku: string; payload: UpdateForecastRequest }
    >({
      query: ({ sku, payload }) => ({
        url: `/inventory/forecast/${sku}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, { sku }) => [{ type: 'InventoryForecast', id: sku }, 'InventoryForecast'],
      transformResponse: (response: { success: boolean; data: InventoryForecastItem }) => response.data,
    }),
    getRestockAlerts: builder.query<
      InventoryForecastAlertsResponse,
      { accountId: string; marketplaceId?: string; sku?: string }
    >({
      query: (params) => ({
        url: '/inventory/forecast/alerts',
        params,
      }),
      providesTags: ['InventoryForecast'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: InventoryForecastAlertsResponse }) => response.data,
    }),
  }),
})

export const {
  useGetForecastsQuery,
  useGetForecastBySKUQuery,
  useUpdateForecastMutation,
  useGetRestockAlertsQuery,
} = inventoryForecastApi

