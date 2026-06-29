import { baseApi } from './baseApi'
import {
  PPCDashboardFilters,
  PPCOverview,
  PPCCampaign,
  PPCAdGroup,
  PPCKeyword,
  PPCListResponse,
} from '@/types/ppcDashboard.types'

export const ppcDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPPCOverview: builder.query<PPCOverview, PPCDashboardFilters>({
      query: (filters) => ({
        url: '/ppc',
        params: filters,
      }),
      providesTags: ['PPC'],
      // Cache for 120 seconds - PPC data can change more frequently but still benefits from caching
      keepUnusedDataFor: 120,
      transformResponse: (response: { success: boolean; data: PPCOverview }) => response.data,
    }),
    getCampaigns: builder.query<PPCListResponse<PPCCampaign>, PPCDashboardFilters>({
      query: (filters) => ({
        url: '/ppc/campaigns',
        params: filters,
      }),
      providesTags: ['PPC'],
      // Cache for 120 seconds - PPC data can change more frequently but still benefits from caching
      keepUnusedDataFor: 120,
      transformResponse: (response: { success: boolean; data: PPCListResponse<PPCCampaign> }) =>
        response.data,
    }),
    getAdGroups: builder.query<PPCListResponse<PPCAdGroup>, PPCDashboardFilters>({
      query: (filters) => ({
        url: '/ppc/ad-groups',
        params: filters,
      }),
      providesTags: ['PPC'],
      // Cache for 120 seconds - PPC data can change more frequently but still benefits from caching
      keepUnusedDataFor: 120,
      transformResponse: (response: { success: boolean; data: PPCListResponse<PPCAdGroup> }) =>
        response.data,
    }),
    getKeywords: builder.query<PPCListResponse<PPCKeyword>, PPCDashboardFilters>({
      query: (filters) => ({
        url: '/ppc/keywords',
        params: filters,
      }),
      providesTags: ['PPC'],
      // Cache for 120 seconds - PPC data can change more frequently but still benefits from caching
      keepUnusedDataFor: 120,
      transformResponse: (response: { success: boolean; data: PPCListResponse<PPCKeyword> }) =>
        response.data,
    }),
  }),
})

export const {
  useGetPPCOverviewQuery,
  useGetCampaignsQuery,
  useGetAdGroupsQuery,
  useGetKeywordsQuery,
} = ppcDashboardApi

