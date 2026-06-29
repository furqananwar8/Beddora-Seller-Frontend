import {
  useGetRefundDiscrepanciesQuery,
  useReconcileRefundDiscrepancyMutation,
} from '@/services/api/refundDiscrepancies.api'

export const useFetchRefundDiscrepancies = useGetRefundDiscrepanciesQuery
export const useReconcileRefundDiscrepancy = useReconcileRefundDiscrepancyMutation

