import { ChartFilters, useGetProfitTrendQuery } from '@/services/api/charts.api'

export const useFetchProfitTrend = (filters: ChartFilters) => {
  return useGetProfitTrendQuery(filters, { pollingInterval: 30000 })
}

