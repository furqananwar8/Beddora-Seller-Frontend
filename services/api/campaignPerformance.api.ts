import { baseApi } from './baseApi'
import type { CampaignSyncState, KeywordsResponse, ParentKeywordsParams, ParentSkuSummary, ParentsParams } from '@/types/campaignPerformance.types'

interface Envelope<T> {
  success: boolean
  data: T
}

export const campaignPerformanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaignParents: builder.query<ParentSkuSummary[], ParentsParams>({
      query: (params) => ({ url: '/campaign-performance/parents', params }),
      providesTags: ['CampaignPerformance'],
      transformResponse: (response: Envelope<ParentSkuSummary[]>) => response.data,
    }),
    getParentKeywords: builder.query<KeywordsResponse, ParentKeywordsParams>({
      query: ({ parentSku, ...params }) => ({
        url: `/campaign-performance/parents/${encodeURIComponent(parentSku)}/keywords`,
        params,
      }),
      providesTags: ['CampaignPerformance'],
      transformResponse: (response: Envelope<KeywordsResponse>) => response.data,
    }),
    /** Latest sync of the keywords and ranks, for Report Sync Management. */
    getCampaignSyncState: builder.query<CampaignSyncState, void>({
      query: () => '/campaign-performance/sync/state',
      transformResponse: (response: Envelope<CampaignSyncState>) => response.data,
      providesTags: ['ReportSyncManagement'],
    }),
    /** Starts the sync in the background: the ad keywords are read from `startDate` to yesterday. */
    startCampaignSync: builder.mutation<{ message: string }, { startDate: string }>({
      query: (body) => ({ url: '/campaign-performance/sync', method: 'POST', body }),
      transformResponse: (response: { message: string }) => ({ message: response.message }),
      invalidatesTags: ['CampaignPerformance', 'ReportSyncManagement'],
    }),
  }),
})

export const { useGetCampaignParentsQuery, useGetParentKeywordsQuery, useGetCampaignSyncStateQuery, useStartCampaignSyncMutation } = campaignPerformanceApi
