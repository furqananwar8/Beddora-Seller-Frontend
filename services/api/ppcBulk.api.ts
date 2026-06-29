import { baseApi } from './baseApi'
import {
  BulkActionResult,
  BulkApplyRecommendationsInput,
  BulkBidUpdateInput,
  BulkHistoryResponse,
  BulkRevertInput,
  BulkStatusChangeInput,
} from '@/types/ppcBulk.types'

export const ppcBulkApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    bulkBidUpdate: builder.mutation<BulkActionResult, BulkBidUpdateInput>({
      query: (payload) => ({
        url: '/ppc/bulk/bid-update',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['PPCBulk', 'PPCOptimization'],
      transformResponse: (response: { success: boolean; data: BulkActionResult }) => response.data,
    }),
    bulkStatusChange: builder.mutation<BulkActionResult, BulkStatusChangeInput>({
      query: (payload) => ({
        url: '/ppc/bulk/status-change',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['PPCBulk', 'PPC'],
      transformResponse: (response: { success: boolean; data: BulkActionResult }) => response.data,
    }),
    applyRecommendations: builder.mutation<BulkActionResult, BulkApplyRecommendationsInput>({
      query: (payload) => ({
        url: '/ppc/bulk/apply-recommendations',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['PPCBulk', 'PPCOptimization'],
      transformResponse: (response: { success: boolean; data: BulkActionResult }) => response.data,
    }),
    getBulkHistory: builder.query<BulkHistoryResponse, { accountId: string }>({
      query: (params) => ({
        url: '/ppc/bulk/history',
        params,
      }),
      providesTags: ['PPCBulk'],
      transformResponse: (response: { success: boolean; data: BulkHistoryResponse }) => response.data,
    }),
    revertBulkAction: builder.mutation<BulkActionResult, BulkRevertInput>({
      query: (payload) => ({
        url: '/ppc/bulk/revert',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['PPCBulk', 'PPCOptimization', 'PPC'],
      transformResponse: (response: { success: boolean; data: BulkActionResult }) => response.data,
    }),
  }),
})

export const {
  useBulkBidUpdateMutation,
  useBulkStatusChangeMutation,
  useApplyRecommendationsMutation,
  useGetBulkHistoryQuery,
  useRevertBulkActionMutation,
} = ppcBulkApi

