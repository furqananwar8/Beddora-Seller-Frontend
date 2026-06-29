'use client'

import React from 'react'
import {
  useGetAmazonAccountsQuery,
  useDeleteAmazonAccountMutation,
  useSwitchAmazonAccountMutation,
  AmazonAccount,
} from '@/services/api/accounts.api'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveAmazonAccount, removeAmazonAccount } from '@/store/accounts.slice'
import { Badge } from '@/design-system/badges'

/**
 * AccountsList Component
 * 
 * Professional Sellerboard-style accounts management table
 */
export const AccountsList: React.FC = () => {
  const { data: accounts, isLoading, error } = useGetAmazonAccountsQuery()
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAmazonAccountMutation()
  const [switchAccount, { isLoading: isSwitching }] = useSwitchAmazonAccountMutation()
  const dispatch = useAppDispatch()
  const activeAmazonAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)

  const handleDelete = async (id: string, marketplace: string) => {
    if (!confirm(`Are you sure you want to unlink the ${marketplace} account? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteAccount(id).unwrap()
      dispatch(removeAmazonAccount(id))
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to unlink account')
    }
  }

  const handleSwitch = async (account: AmazonAccount) => {
    if (activeAmazonAccountId === account.id) {
      return
    }

    try {
      const result = await switchAccount(account.id).unwrap()
      dispatch(setActiveAmazonAccount(result.id))
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to switch account')
    }
  }

  const getMarketplaceFlag = (marketplace: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸',
      'CA': '🇨🇦',
      'UK': '🇬🇧',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸',
      'JP': '🇯🇵',
      'AU': '🇦🇺',
    }
    return flags[marketplace] || '🌐'
  }

  if (isLoading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to Load Accounts</h3>
            <p className="text-sm text-gray-500">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Linked Accounts</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Connect your first Amazon Seller Central account above to start syncing your data and accessing advanced analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getConnectionHealth = (account: AmazonAccount) => {
    // Calculate days since connection
    const daysSinceConnection = Math.floor(
      (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (!account.isActive) {
      return { status: 'error', label: 'Inactive', color: 'text-red-600 bg-red-50' }
    }
    
    if (account.lastTokenRefreshAt) {
      const daysSinceRefresh = Math.floor(
        (Date.now() - new Date(account.lastTokenRefreshAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceRefresh > 30) {
        return { status: 'warning', label: 'Needs Refresh', color: 'text-orange-600 bg-orange-50' }
      }
    }
    
    return { status: 'success', label: 'Connected', color: 'text-green-600 bg-green-50' }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Linked Amazon Accounts</CardTitle>
              <CardDescription className="mt-1">
                Manage your connected Amazon Seller Central accounts
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="primary" className="px-3 py-1.5 font-semibold">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Scroll to connect section
                document.getElementById('connect-amazon-account')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Marketplace
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Seller ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Connection Health
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Connected
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => {
                const isActive = activeAmazonAccountId === account.id
                const isAccountActive = account.isActive
                const health = getConnectionHealth(account)

                return (
                  <tr
                    key={account.id}
                    className={`transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getMarketplaceFlag(account.marketplace)}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{account.marketplace}</span>
                          {account.region && (
                            <span className="text-xs text-gray-500 mt-0.5">{account.region}</span>
                          )}
                          {isActive && (
                            <Badge variant="success" className="mt-1.5 w-fit text-xs">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                          {account.sellerId}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={health.status === 'success' ? 'success' : health.status === 'warning' ? 'warning' : 'error'}
                          className="inline-flex items-center gap-1.5"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            health.status === 'success' ? 'bg-green-500' :
                            health.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          {health.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(account.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {account.lastTokenRefreshAt ? (
                          <>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {new Date(account.lastTokenRefreshAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant={isActive ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleSwitch(account)}
                          disabled={isActive || isSwitching}
                          className="min-w-[90px]"
                        >
                          {isActive ? (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Selected
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Select
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(account.id, account.marketplace)}
                          disabled={isDeleting}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Unlink
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
