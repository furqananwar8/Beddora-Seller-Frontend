import {
  useGetFeedbackAlertsQuery,
  useMarkFeedbackAlertReadMutation,
  useMarkFeedbackAlertResolvedMutation,
} from '@/services/api/feedbackAlerts.api'

export const useFetchFeedbackAlerts = useGetFeedbackAlertsQuery
export const useMarkFeedbackAlertRead = useMarkFeedbackAlertReadMutation
export const useMarkFeedbackAlertResolved = useMarkFeedbackAlertResolvedMutation

