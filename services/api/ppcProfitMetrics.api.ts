import { baseApi } from './baseApi'
import {
  PPCProfitMetricsFilters,
  PPCProfitMetricsResponse,
  PPCProfitOverview,
} from '@/types/ppcProfitMetrics.types'

export const ppcProfitMetricsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPpcProfitOverview: builder.query<PPCProfitOverview, PPCProfitMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/profit',
        params: filters,
      }),
      providesTags: ['PPCProfit'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCProfitOverview }) => response.data,
    }),
    getCampaignProfit: builder.query<PPCProfitMetricsResponse, PPCProfitMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/profit/campaigns',
        params: filters,
      }),
      providesTags: ['PPCProfit'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCProfitMetricsResponse }) =>
        response.data,
    }),
    getAdGroupProfit: builder.query<PPCProfitMetricsResponse, PPCProfitMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/profit/ad-groups',
        params: filters,
      }),
      providesTags: ['PPCProfit'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCProfitMetricsResponse }) =>
        response.data,
    }),
    getKeywordProfit: builder.query<PPCProfitMetricsResponse, PPCProfitMetricsFilters>({
      query: (filters) => ({
        url: '/ppc/profit/keywords',
        params: filters,
      }),
      providesTags: ['PPCProfit'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCProfitMetricsResponse }) =>
        response.data,
    }),
  }),
})

export const {
  useGetPpcProfitOverviewQuery,
  useGetCampaignProfitQuery,
  useGetAdGroupProfitQuery,
  useGetKeywordProfitQuery,
} = ppcProfitMetricsApi

