import {
  useGetBuyBoxAlertsQuery,
  useMarkBuyBoxAlertReadMutation,
  useMarkBuyBoxAlertResolvedMutation,
} from '@/services/api/buyBoxAlerts.api'

export const useFetchBuyBoxAlerts = useGetBuyBoxAlertsQuery
export const useMarkBuyBoxAlertRead = useMarkBuyBoxAlertReadMutation
export const useMarkBuyBoxAlertResolved = useMarkBuyBoxAlertResolvedMutation

