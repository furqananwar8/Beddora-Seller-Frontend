import {
  useBulkBidUpdateMutation,
  useBulkStatusChangeMutation,
  useApplyRecommendationsMutation,
  useGetBulkHistoryQuery,
  useRevertBulkActionMutation,
} from '@/services/api/ppcBulk.api'

export const useBulkBidUpdate = useBulkBidUpdateMutation
export const useBulkStatusChange = useBulkStatusChangeMutation
export const useApplyRecommendations = useApplyRecommendationsMutation
export const useFetchBulkHistory = useGetBulkHistoryQuery
export const useRevertBulkAction = useRevertBulkActionMutation

