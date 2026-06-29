import {
  useGetPpcProfitOverviewQuery,
  useGetCampaignProfitQuery,
  useGetAdGroupProfitQuery,
  useGetKeywordProfitQuery,
} from '@/services/api/ppcProfitMetrics.api'

export const useFetchPPCProfitMetrics = useGetPpcProfitOverviewQuery
export const useFetchCampaignProfit = useGetCampaignProfitQuery
export const useFetchAdGroupProfit = useGetAdGroupProfitQuery
export const useFetchKeywordProfit = useGetKeywordProfitQuery

