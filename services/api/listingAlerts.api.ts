import { baseApi } from './baseApi'
import { ListingAlertFilters, ListingAlertsResponse } from '@/types/listingAlerts.types'

export const listingAlertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getListingAlerts: builder.query<ListingAlertsResponse, ListingAlertFilters | void>({
      query: (filters) => ({
        url: '/alerts/listing',
        ...(filters && { params: filters }),
      }),
      providesTags: ['ListingAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: ListingAlertsResponse }) =>
        response.data,
    }),
    getListingAlertsByAsin: builder.query<ListingAlertsResponse, { asin: string; marketplaceId?: string }>({
      query: ({ asin, marketplaceId }) => ({
        url: `/alerts/listing/${asin}`,
        params: { marketplaceId },
      }),
      providesTags: ['ListingAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: ListingAlertsResponse }) =>
        response.data,
    }),
    markListingAlertRead: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/listing/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['ListingAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
    markListingAlertResolved: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/listing/${id}/resolve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['ListingAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
  }),
})

export const {
  useGetListingAlertsQuery,
  useGetListingAlertsByAsinQuery,
  useMarkListingAlertReadMutation,
  useMarkListingAlertResolvedMutation,
} = listingAlertsApi

