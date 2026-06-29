import { ReturnFilters, useGetReturnsSummaryQuery } from '@/services/api/returns.api'

export const useFetchReturnsSummary = (filters: ReturnFilters) => {
  return useGetReturnsSummaryQuery(filters)
}

