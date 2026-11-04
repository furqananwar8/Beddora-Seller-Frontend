import { baseApi } from './baseApi'
import type { KeywordsResponse, ParentKeywordsParams, ParentSkuSummary, ParentsParams } from '@/types/campaignPerformance.types'

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
  }),
})

export const { useGetCampaignParentsQuery, useGetParentKeywordsQuery } = campaignPerformanceApi
