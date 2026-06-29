import {
  useGetOptimizationStatusQuery,
  useRunOptimizationMutation,
  useManualBidUpdateMutation,
  useGetOptimizationHistoryQuery,
} from '@/services/api/ppcOptimization.api'

export const useFetchOptimizationStatus = useGetOptimizationStatusQuery
export const useRunOptimization = useRunOptimizationMutation
export const useManualBidUpdate = useManualBidUpdateMutation
export const useFetchOptimizationHistory = useGetOptimizationHistoryQuery

