import { baseApi } from './baseApi'
import { BuyBoxAlertFilters, BuyBoxAlertsResponse } from '@/types/buyBoxAlerts.types'

export const buyBoxAlertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuyBoxAlerts: builder.query<BuyBoxAlertsResponse, BuyBoxAlertFilters | void>({
      query: (filters) => ({
        url: '/alerts/buy-box',
        ...(filters && { params: filters }),
      }),
      providesTags: ['BuyBoxAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: BuyBoxAlertsResponse }) =>
        response.data,
    }),
    getBuyBoxAlertsByAsin: builder.query<BuyBoxAlertsResponse, { asin: string; marketplaceId?: string }>({
      query: ({ asin, marketplaceId }) => ({
        url: `/alerts/buy-box/${asin}`,
        params: { marketplaceId },
      }),
      providesTags: ['BuyBoxAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: BuyBoxAlertsResponse }) =>
        response.data,
    }),
    markBuyBoxAlertRead: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/buy-box/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['BuyBoxAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
    markBuyBoxAlertResolved: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/buy-box/${id}/resolve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['BuyBoxAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
  }),
})

export const {
  useGetBuyBoxAlertsQuery,
  useGetBuyBoxAlertsByAsinQuery,
  useMarkBuyBoxAlertReadMutation,
  useMarkBuyBoxAlertResolvedMutation,
} = buyBoxAlertsApi

