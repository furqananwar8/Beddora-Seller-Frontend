import { ChartFilters, useGetReturnsTrendQuery } from '@/services/api/charts.api'

export const useFetchReturnsTrend = (filters: ChartFilters) => {
  return useGetReturnsTrendQuery(filters, { pollingInterval: 30000 })
}

