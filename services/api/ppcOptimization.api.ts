import { baseApi } from './baseApi'
import {
  PPCOptimizationFilters,
  PPCOptimizationHistoryResponse,
  PPCOptimizationItem,
  PPCOptimizationRunInput,
  PPCOptimizationRunResult,
  PPCOptimizationStatusResponse,
} from '@/types/ppcOptimization.types'

export const ppcOptimizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOptimizationStatus: builder.query<PPCOptimizationStatusResponse, PPCOptimizationFilters>({
      query: (filters) => ({
        url: '/ppc/optimization',
        params: filters,
      }),
      providesTags: ['PPCOptimization'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCOptimizationStatusResponse }) =>
        response.data,
    }),
    runOptimization: builder.mutation<PPCOptimizationRunResult, PPCOptimizationRunInput>({
      query: (payload) => ({
        url: '/ppc/optimization/run',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['PPCOptimization', 'PPC'],
      transformResponse: (response: { success: boolean; data: PPCOptimizationRunResult }) =>
        response.data,
    }),
    manualBidUpdate: builder.mutation<
      PPCOptimizationItem,
      { keywordId: string; payload: { accountId: string; currentBid: number } }
    >({
      query: ({ keywordId, payload }) => ({
        url: `/ppc/optimization/${keywordId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['PPCOptimization'],
      transformResponse: (response: { success: boolean; data: PPCOptimizationItem }) => response.data,
    }),
    getOptimizationHistory: builder.query<
      PPCOptimizationHistoryResponse,
      { accountId: string; keywordId?: string }
    >({
      query: (filters) => ({
        url: '/ppc/optimization/history',
        params: filters,
      }),
      providesTags: ['PPCOptimization'],
      keepUnusedDataFor: 30,
      transformResponse: (response: { success: boolean; data: PPCOptimizationHistoryResponse }) =>
        response.data,
    }),
  }),
})

export const {
  useGetOptimizationStatusQuery,
  useRunOptimizationMutation,
  useManualBidUpdateMutation,
  useGetOptimizationHistoryQuery,
} = ppcOptimizationApi

