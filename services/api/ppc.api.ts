import { baseApi } from './baseApi'

/**
 * PPC (Pay-Per-Click) API endpoints
 * 
 * Add your PPC-related API calls here.
 * This includes ad campaigns, performance metrics, costs, etc.
 */

export interface PPCCampaign {
  id: string
  name: string
  platform: 'amazon' | 'google' | 'facebook'
  status: 'active' | 'paused' | 'archived'
  budget: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
  acos: number
  roas: number
  startDate: string
  endDate?: string
}

export interface PPCFilters {
  platform?: PPCCampaign['platform']
  status?: PPCCampaign['status']
  startDate?: string
  endDate?: string
}

export interface PPCPerformance {
  totalSpend: number
  totalRevenue: number
  totalClicks: number
  totalImpressions: number
  averageACOS: number
  averageROAS: number
  campaigns: PPCCampaign[]
}

export const ppcApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query<PPCCampaign[], PPCFilters>({
      query: (filters) => ({
        url: '/ppc/campaigns',
        params: filters,
      }),
      providesTags: ['PPC'],
    }),
    getCampaign: builder.query<PPCCampaign, string>({
      query: (id) => `/ppc/campaigns/${id}`,
      providesTags: (result, error, id) => [{ type: 'PPC', id }],
    }),
    getPPCPerformance: builder.query<PPCPerformance, PPCFilters>({
      query: (filters) => ({
        url: '/ppc/performance',
        params: filters,
      }),
      providesTags: ['PPC'],
    }),
    updateCampaign: builder.mutation<PPCCampaign, Partial<PPCCampaign> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/ppc/campaigns/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PPC', id }, 'PPC'],
    }),
  }),
})

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useGetPPCPerformanceQuery,
  useUpdateCampaignMutation,
} = ppcApi

