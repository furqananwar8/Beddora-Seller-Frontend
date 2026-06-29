'use client'

import React, { useEffect } from 'react'
import {
  useGetAmazonAccountsQuery,
  useSwitchAmazonAccountMutation,
  AmazonAccount,
} from '@/services/api/accounts.api'
import { Select } from '@/design-system/inputs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveAmazonAccount, setAmazonAccounts } from '@/store/accounts.slice'
import { Spinner } from '@/design-system/loaders'

interface SwitchAccountDropdownProps {
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Show label
   */
  showLabel?: boolean
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * Callback when account is switched
   */
  onSwitch?: (account: AmazonAccount) => void
}

/**
 * SwitchAccountDropdown Component
 * 
 * Dropdown selector for switching between linked Amazon accounts
 * Features:
 * - Displays all linked accounts
 * - Shows current active account
 * - Updates both backend session and frontend state
 * - Auto-selects first active account if none selected
 */
export const SwitchAccountDropdown: React.FC<SwitchAccountDropdownProps> = ({
  className = '',
  showLabel = true,
  placeholder = 'Select Amazon account',
  onSwitch,
}) => {
  const dispatch = useAppDispatch()
  const activeAmazonAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)

  const { data: accounts, isLoading } = useGetAmazonAccountsQuery()
  const [switchAccount, { isLoading: isSwitching }] = useSwitchAmazonAccountMutation()

  // Sync accounts to Redux store
  useEffect(() => {
    if (accounts) {
      dispatch(setAmazonAccounts(accounts))
    }
  }, [accounts, dispatch])

  // Auto-select first active account if none selected
  useEffect(() => {
    if (accounts && accounts.length > 0 && !activeAmazonAccountId) {
      const activeAccount = accounts.find((acc) => acc.isActive)
      if (activeAccount) {
        dispatch(setActiveAmazonAccount(activeAccount.id))
      }
    }
  }, [accounts, activeAmazonAccountId, dispatch])

  /**
   * Handle account selection change
   */
  const handleChange = async (accountId: string) => {
    if (accountId === activeAmazonAccountId) {
      return // Already selected
    }

    const selectedAccount = accounts?.find((acc) => acc.id === accountId)
    if (!selectedAccount) {
      return
    }

    try {
      const result = await switchAccount(accountId).unwrap()
      dispatch(setActiveAmazonAccount(result.id))
      onSwitch?.(result)
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to switch account')
    }
  }

  if (isLoading) {
    return (
      <div className={className}>
        {showLabel && <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>}
        <div className="flex items-center">
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">Loading accounts...</span>
        </div>
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className={className}>
        {showLabel && <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>}
        <div className="text-sm text-gray-500">No accounts linked</div>
      </div>
    )
  }

  // Filter to only show active accounts
  const activeAccounts = accounts.filter((acc) => acc.isActive)

  if (activeAccounts.length === 0) {
    return (
      <div className={className}>
        {showLabel && <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>}
        <div className="text-sm text-gray-500">No active accounts</div>
      </div>
    )
  }

  // Build options for dropdown
  const options = [
    ...(!activeAmazonAccountId ? [{ label: placeholder, value: '' }] : []),
    ...activeAccounts.map((account) => ({
      label: `${account.marketplace} - ${account.sellerId}`,
      value: account.id,
    })),
  ]

  return (
    <div className={className}>
      <Select
        label={showLabel ? 'Amazon Account' : undefined}
        value={activeAmazonAccountId || ''}
        onChange={(e) => handleChange(e.target.value)}
        options={options}
        disabled={isSwitching || activeAccounts.length === 1}
      />
      {isSwitching && (
        <p className="text-xs text-gray-500 mt-1">Switching account...</p>
      )}
    </div>
  )
}

