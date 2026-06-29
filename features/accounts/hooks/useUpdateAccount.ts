import { useCallback } from 'react'
import {
  useUpdateAmazonAccountMutation,
  UpdateAmazonAccountRequest,
  AmazonAccount,
} from '@/services/api/accounts.api'
import { useAppDispatch } from '@/store/hooks'
import { updateAmazonAccount } from '@/store/accounts.slice'

/**
 * useUpdateAccount Hook
 * 
 * Hook for updating an existing Amazon account
 * Handles mutation, error handling, and Redux state updates
 * 
 * @returns Object with updateAccount function and loading/error states
 */
export function useUpdateAccount() {
  const dispatch = useAppDispatch()
  const [updateAccountMutation, { isLoading, error }] = useUpdateAmazonAccountMutation()

  /**
   * Update an existing Amazon account
   * 
   * @param accountId - ID of the account to update
   * @param data - Updated account data (partial)
   * @returns Promise that resolves with the updated account
   */
  const updateAccount = useCallback(
    async (accountId: string, data: UpdateAmazonAccountRequest): Promise<AmazonAccount> => {
      try {
        const result = await updateAccountMutation({ id: accountId, data }).unwrap()
        dispatch(updateAmazonAccount(result))
        return result
      } catch (err) {
        throw err
      }
    },
    [updateAccountMutation, dispatch]
  )

  return {
    updateAccount,
    isLoading,
    error,
  }
}

