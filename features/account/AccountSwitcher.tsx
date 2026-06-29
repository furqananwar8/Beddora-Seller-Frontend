'use client'

import React from 'react'
import { useGetAccountsQuery, useSwitchAccountMutation } from '@/services/api/accounts.api'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setAccountId } from '@/store/auth.slice'
import { setActiveAccount } from '@/store/accounts.slice'
import { Select } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'

/**
 * Account switcher component
 * Allows users to switch between their accounts
 */
export const AccountSwitcher: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeAccountId = useAppSelector((state) => state.auth.accountId)
  const { data: accounts, isLoading } = useGetAccountsQuery()
  const [switchAccount, { isLoading: isSwitching }] = useSwitchAccountMutation()

  const handleSwitch = async (accountId: string) => {
    try {
      const result = await switchAccount({ accountId }).unwrap()
      dispatch(setAccountId(result.accountId))
      
      // Update active account in accounts slice
      const account = accounts?.find((acc) => acc.id === result.accountId)
      if (account) {
        dispatch(setActiveAccount(account))
      }
      
      // Refresh page to update all data
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch account', error)
    }
  }

  if (isLoading) {
    return <Spinner size="sm" />
  }

  if (!accounts || accounts.length === 0) {
    return null
  }

  const options = accounts.map((account) => ({
    value: account.id,
    label: `${account.name}${account.isDefault ? ' (Default)' : ''}`,
  }))

  return (
    <div className="min-w-[200px]">
      <Select
        label="Account"
        value={activeAccountId || accounts.find((acc) => acc.isDefault)?.id || accounts[0].id}
        onChange={(e) => handleSwitch(e.target.value)}
        options={options}
        disabled={isSwitching}
      />
    </div>
  )
}
