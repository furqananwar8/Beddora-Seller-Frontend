import {
  useGetFeeChangeAlertsQuery,
  useMarkFeeChangeAlertReadMutation,
  useMarkFeeChangeAlertResolvedMutation,
} from '@/services/api/feeChangeAlerts.api'

export const useFetchFeeChangeAlerts = useGetFeeChangeAlertsQuery
export const useMarkFeeChangeAlertRead = useMarkFeeChangeAlertReadMutation
export const useMarkFeeChangeAlertResolved = useMarkFeeChangeAlertResolvedMutation

