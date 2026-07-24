"use client"

import { useRef, useEffect } from "react"
import { useGetScheduledJobsQuery } from "@/services/api/campaigns.api"
import type { ScheduledJobsResponse } from "@/services/api/campaigns.api"

interface UseScheduledJobsParams {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: string
  campaignId?: string
  search?: string
}

export function useScheduledJobs({
  page = 1,
  limit = 20,
  status,
  sortBy,
  sortOrder,
  campaignId,
  search = "",
}: UseScheduledJobsParams = {}) {
  const result = useGetScheduledJobsQuery({
    page,
    limit,
    status,
    sortBy,
    sortOrder,
    campaignId,
    search,
  })

  const previousDataRef = useRef<ScheduledJobsResponse | undefined>(undefined)

  useEffect(() => {
    if (result.data) {
      previousDataRef.current = result.data
    }
  }, [result.data])

  const data = result.data ?? previousDataRef.current
  const isPlaceholderData = result.isFetching && !!previousDataRef.current && !result.data
  const isLoading = result.isLoading && !data

  return {
    data,
    isLoading,
    isFetching: result.isFetching,
    isPlaceholderData,
    error: result.error,
    isError: result.isError,
    isSuccess: result.isSuccess,
    refetch: result.refetch,
  }
}