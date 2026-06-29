import { ChartFilters, useGetSalesTrendQuery } from '@/services/api/charts.api'

export const useFetchSalesTrend = (filters: ChartFilters) => {
  return useGetSalesTrendQuery(filters, { pollingInterval: 30000 })
}

