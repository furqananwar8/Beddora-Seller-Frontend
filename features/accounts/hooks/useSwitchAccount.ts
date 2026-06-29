import { useCallback } from 'react'
import { useSwitchAmazonAccountMutation, AmazonAccount } from '@/services/api/accounts.api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveAmazonAccount } from '@/store/accounts.slice'

/**
 * useSwitchAccount Hook
 * 
 * Hook for switching the active Amazon account
 * Updates both backend session and frontend state
 * 
 * @returns Object with switchAccount function and loading/error states
 */
export function useSwitchAccount() {
  const dispatch = useAppDispatch()
  const activeAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)
  const accounts = useAppSelector((state) => state.accounts.amazonAccounts)
  const [switchAccountMutation, { isLoading, error }] = useSwitchAmazonAccountMutation()

  /**
   * Switch to a different Amazon account
   * 
   * @param accountId - ID of the account to switch to
   * @returns Promise that resolves with the active account
   */
  const switchAccount = useCallback(
    async (accountId: string): Promise<AmazonAccount> => {
      if (accountId === activeAccountId) {
        // Already active, return current account from store
        const currentAccount = accounts.find((acc) => acc.id === accountId)
        if (currentAccount) {
          return currentAccount
        }
      }

      try {
        const result = await switchAccountMutation(accountId).unwrap()
        dispatch(setActiveAmazonAccount(result.id))
        return result
      } catch (err) {
        throw err
      }
    },
    [switchAccountMutation, dispatch, activeAccountId, accounts]
  )

  return {
    switchAccount,
    activeAccountId,
    isLoading,
    error,
  }
}

