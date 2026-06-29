import {
  useGetInventoryStockQuery,
  useGetInventoryStockBySKUQuery,
  useUpdateInventoryStockMutation,
  useGetLowStockAlertsQuery,
} from '@/services/api/inventoryStock.api'

export const useFetchInventory = useGetInventoryStockQuery
export const useFetchInventoryBySKU = useGetInventoryStockBySKUQuery
export const useUpdateInventory = useUpdateInventoryStockMutation
export const useFetchLowStockAlerts = useGetLowStockAlertsQuery

