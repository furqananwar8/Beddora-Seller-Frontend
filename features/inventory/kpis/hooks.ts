import {
  useGetInventoryKpisQuery,
  useGetInventoryKpiBySKUQuery,
  useRecalculateInventoryKpisMutation,
} from '@/services/api/inventoryKpis.api'

export const useFetchInventoryKPIs = useGetInventoryKpisQuery
export const useFetchInventoryKPIBySKU = useGetInventoryKpiBySKUQuery
export const useRecalculateKPIs = useRecalculateInventoryKpisMutation

