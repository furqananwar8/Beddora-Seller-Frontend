import {
  useGetListingAlertsQuery,
  useMarkListingAlertReadMutation,
  useMarkListingAlertResolvedMutation,
} from '@/services/api/listingAlerts.api'

export const useFetchListingAlerts = useGetListingAlertsQuery
export const useMarkAlertRead = useMarkListingAlertReadMutation
export const useMarkAlertResolved = useMarkListingAlertResolvedMutation

