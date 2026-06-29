import {
  useGetForecastsQuery,
  useGetForecastBySKUQuery,
  useGetRestockAlertsQuery,
  useUpdateForecastMutation,
} from '@/services/api/inventoryForecast.api'

export const useFetchForecast = useGetForecastsQuery
export const useFetchForecastBySKU = useGetForecastBySKUQuery
export const useFetchRestockAlerts = useGetRestockAlertsQuery
export const useUpdateForecast = useUpdateForecastMutation

