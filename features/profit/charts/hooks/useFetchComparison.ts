import { ChartFilters, ChartMetric, useGetComparisonQuery } from '@/services/api/charts.api'

export const useFetchComparison = (filters: ChartFilters & { metric?: ChartMetric }) => {
  return useGetComparisonQuery(filters, { pollingInterval: 30000 })
}

