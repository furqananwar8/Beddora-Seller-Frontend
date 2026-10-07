import { useGetApproverStatusQuery } from '@/services/api/finance.api'

/**
 * What the signed-in user may do in finance, as decided by the server from their permissions.
 * Screens hide actions the user cannot perform; the API enforces the same rules.
 */
export function useFinanceCapabilities() {
  const { data } = useGetApproverStatusQuery()
  return {
    isApprover: data?.isApprover ?? false,
    canManageExpenseTypes: data?.canManageExpenseTypes ?? false,
    canManageApprovers: data?.canManageApprovers ?? false,
    canWritePartners: data?.canWritePartners ?? false,
    canWriteBankProfiles: data?.canWriteBankProfiles ?? false,
    canCreateRequests: data?.canCreateRequests ?? false,
    canProcessPayments: data?.canProcessPayments ?? false,
  }
}
