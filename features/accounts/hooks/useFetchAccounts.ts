import { useEffect } from 'react'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAmazonAccounts, setAmazonLoading } from '@/store/accounts.slice'

/**
 * useFetchAccounts Hook
 * 
 * Fetches and manages Amazon accounts in Redux store
 * Automatically syncs data from API to store
 * 
 * @returns Object with accounts data, loading state, and error
 */
export function useFetchAccounts() {
  const dispatch = useAppDispatch()
  const { data: accounts, isLoading, error, refetch } = useGetAmazonAccountsQuery()

  // Sync accounts to Redux store
  useEffect(() => {
    if (accounts) {
      dispatch(setAmazonAccounts(accounts))
    }
  }, [accounts, dispatch])

  // Sync loading state
  useEffect(() => {
    dispatch(setAmazonLoading(isLoading))
  }, [isLoading, dispatch])

  // Get accounts from store
  const storeAccounts = useAppSelector((state) => state.accounts.amazonAccounts)
  const storeLoading = useAppSelector((state) => state.accounts.isAmazonLoading)

  return {
    accounts: storeAccounts,
    isLoading: storeLoading || isLoading,
    error,
    refetch,
  }
}

