import { ReturnFilters, useGetReturnsQuery } from '@/services/api/returns.api'

export const useFetchReturns = (filters: ReturnFilters) => {
  return useGetReturnsQuery(filters)
}

