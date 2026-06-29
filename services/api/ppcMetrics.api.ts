import { baseApi } from './baseApi'
import { PPCMetricsFilters, PPCMetricsOverview, PPCMetricsResponse } from '@/types/ppcMetrics.types'

export const ppcMetricsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPPCMetrics: builder.query<PPCMetricsOverview, PPCMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/metrics',
        params: filters,
      }),
      providesTags: ['PPCMetrics'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCMetricsOverview }) => response.data,
    }),
    getCampaignMetrics: builder.query<PPCMetricsResponse, PPCMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/metrics/campaigns',
        params: filters,
      }),
      providesTags: ['PPCMetrics'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCMetricsResponse }) => response.data,
    }),
    getAdGroupMetrics: builder.query<PPCMetricsResponse, PPCMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/metrics/ad-groups',
        params: filters,
      }),
      providesTags: ['PPCMetrics'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCMetricsResponse }) => response.data,
    }),
    getKeywordMetrics: builder.query<PPCMetricsResponse, PPCMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/metrics/keywords',
        params: filters,
      }),
      providesTags: ['PPCMetrics'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCMetricsResponse }) => response.data,
    }),
  }),
})

export const {
  useGetPPCMetricsQuery,
  useGetCampaignMetricsQuery,
  useGetAdGroupMetricsQuery,
  useGetKeywordMetricsQuery,
} = ppcMetricsApi

