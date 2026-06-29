import { baseApi } from './baseApi'
import { FeeChangeAlertFilters, FeeChangeAlertsResponse } from '@/types/feeChangeAlerts.types'

export const feeChangeAlertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeeChangeAlerts: builder.query<FeeChangeAlertsResponse, FeeChangeAlertFilters | void>({
      query: (filters) => ({
        url: '/alerts/fees',
        ...(filters && { params: filters }),
      }),
      providesTags: ['FeeChangeAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: FeeChangeAlertsResponse }) =>
        response.data,
    }),
    getFeeChangeAlertsByMarketplace: builder.query<
      FeeChangeAlertsResponse,
      { marketplaceId: string; sku?: string; feeType?: string }
    >({
      query: ({ marketplaceId, sku, feeType }) => ({
        url: `/alerts/fees/${marketplaceId}`,
        params: { sku, feeType },
      }),
      providesTags: ['FeeChangeAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: FeeChangeAlertsResponse }) =>
        response.data,
    }),
    markFeeChangeAlertRead: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/fees/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['FeeChangeAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
    markFeeChangeAlertResolved: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/fees/${id}/resolve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['FeeChangeAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
  }),
})

export const {
  useGetFeeChangeAlertsQuery,
  useGetFeeChangeAlertsByMarketplaceQuery,
  useMarkFeeChangeAlertReadMutation,
  useMarkFeeChangeAlertResolvedMutation,
} = feeChangeAlertsApi

