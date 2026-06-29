import {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useGetPurchaseOrderSummaryQuery,
} from '@/services/api/purchaseOrders.api'

export const useFetchPOs = useGetPurchaseOrdersQuery
export const useFetchPOById = useGetPurchaseOrderQuery
export const useCreatePO = useCreatePurchaseOrderMutation
export const useUpdatePO = useUpdatePurchaseOrderMutation
export const useDeletePO = useDeletePurchaseOrderMutation
export const useFetchPOAlerts = useGetPurchaseOrderSummaryQuery
// Placeholder exports for features not yet implemented
export const useFetchInboundShipments = useGetPurchaseOrdersQuery
export const useUpdateInboundShipment = useUpdatePurchaseOrderMutation
export const useDuplicatePO = useCreatePurchaseOrderMutation

