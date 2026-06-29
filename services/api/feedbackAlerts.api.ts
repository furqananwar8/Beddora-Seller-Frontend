import { baseApi } from './baseApi'
import { FeedbackAlertFilters, FeedbackAlertsResponse } from '@/types/feedbackAlerts.types'

export const feedbackAlertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeedbackAlerts: builder.query<FeedbackAlertsResponse, FeedbackAlertFilters | void>({
      query: (filters) => ({
        url: '/alerts/feedback',
        ...(filters && { params: filters }),
      }),
      providesTags: ['FeedbackAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: FeedbackAlertsResponse }) =>
        response.data,
    }),
    getFeedbackAlertsByAsin: builder.query<FeedbackAlertsResponse, { asin: string; marketplaceId?: string }>({
      query: ({ asin, marketplaceId }) => ({
        url: `/alerts/feedback/${asin}`,
        params: { marketplaceId },
      }),
      providesTags: ['FeedbackAlerts'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: FeedbackAlertsResponse }) =>
        response.data,
    }),
    markFeedbackAlertRead: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/feedback/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['FeedbackAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
    markFeedbackAlertResolved: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/alerts/feedback/${id}/resolve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['FeedbackAlerts'],
      transformResponse: (response: { success: boolean; data: { id: string; status: string } }) =>
        response.data,
    }),
  }),
})

export const {
  useGetFeedbackAlertsQuery,
  useGetFeedbackAlertsByAsinQuery,
  useMarkFeedbackAlertReadMutation,
  useMarkFeedbackAlertResolvedMutation,
} = feedbackAlertsApi

