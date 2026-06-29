import { ChartFilters, useGetPpcTrendQuery } from '@/services/api/charts.api'

export const useFetchPPCCostTrend = (filters: ChartFilters) => {
  return useGetPpcTrendQuery(filters, { pollingInterval: 30000 })
}

