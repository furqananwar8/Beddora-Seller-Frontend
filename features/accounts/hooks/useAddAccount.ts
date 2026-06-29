import { useCallback } from 'react'
import {
  useLinkAmazonAccountMutation,
  LinkAmazonAccountRequest,
  AmazonAccount,
} from '@/services/api/accounts.api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addAmazonAccount, setActiveAmazonAccount } from '@/store/accounts.slice'

/**
 * useAddAccount Hook
 * 
 * Hook for adding a new Amazon account
 * Handles mutation, error handling, and Redux state updates
 * 
 * @returns Object with addAccount function and loading/error states
 */
export function useAddAccount() {
  const dispatch = useAppDispatch()
  const accounts = useAppSelector((state) => state.accounts.amazonAccounts)
  const [linkAccount, { isLoading, error }] = useLinkAmazonAccountMutation()

  /**
   * Add a new Amazon account
   * 
   * @param data - Account credentials and metadata
   * @returns Promise that resolves with the created account
   */
  const addAccount = useCallback(
    async (data: LinkAmazonAccountRequest): Promise<AmazonAccount> => {
      try {
        const result = await linkAccount(data).unwrap()
        dispatch(addAmazonAccount(result))
        
        // Auto-select if it's the first account
        if (accounts.length === 0) {
          dispatch(setActiveAmazonAccount(result.id))
        }
        
        return result
      } catch (err) {
        throw err
      }
    },
    [linkAccount, dispatch, accounts.length]
  )

  return {
    addAccount,
    isLoading,
    error,
  }
}

