'use client'

import React, { useEffect } from 'react'
import { useGetSyncLogsQuery } from '@/services/api/sync.api'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { Card } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSyncLogs, setLoadingLogs } from '@/store/amazon.slice'
import { Select } from '@/design-system/inputs'

/**
 * SyncLogsTable Component
 * 
 * Displays sync history and logs
 * Features:
 * - Filter by account and sync type
 * - Show sync status, records synced/failed
 * - Display errors and metadata
 */

export const SyncLogsTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(activeAccountId || undefined)
  const [selectedSyncType, setSelectedSyncType] = React.useState<string>('')

  const { data: accounts } = useGetAmazonAccountsQuery()
  const { data: logs, isLoading } = useGetSyncLogsQuery({
    amazonAccountId: selectedAccountId,
    syncType: selectedSyncType || undefined,
    limit: 50,
  })

  // Sync logs to Redux store
  useEffect(() => {
    if (logs?.data) {
      dispatch(setSyncLogs(logs.data))
    }
  }, [logs, dispatch])

  useEffect(() => {
    dispatch(setLoadingLogs(isLoading))
  }, [isLoading, dispatch])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      case 'partial':
        return <Badge variant="warning">Partial</Badge>
      default:
        return <Badge variant="primary">{status}</Badge>
    }
  }

  const getSyncTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      orders: 'Orders',
      fees: 'Fees',
      ppc: 'PPC',
      inventory: 'Inventory',
      listings: 'Listings',
      refunds: 'Refunds',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Spinner />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sync History</h2>
        <div className="flex gap-4">
          <Select
            label="Account"
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value || undefined)}
            options={[
              { label: 'All Accounts', value: '' },
              ...(accounts || []).map((acc) => ({
                label: `${acc.marketplace} - ${acc.sellerId}`,
                value: acc.id,
              })),
            ]}
          />
          <Select
            label="Sync Type"
            value={selectedSyncType}
            onChange={(e) => setSelectedSyncType(e.target.value)}
            options={[
              { label: 'All Types', value: '' },
              { label: 'Orders', value: 'orders' },
              { label: 'Fees', value: 'fees' },
              { label: 'PPC', value: 'ppc' },
              { label: 'Inventory', value: 'inventory' },
              { label: 'Listings', value: 'listings' },
              { label: 'Refunds', value: 'refunds' },
            ]}
          />
        </div>
      </div>

      {!logs?.data || logs.data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No sync logs found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.data.map((log) => {
                const duration = log.completedAt
                  ? Math.round(
                      (new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000
                    )
                  : null

                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium">{getSyncTypeLabel(log.syncType)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {log.amazonAccount
                          ? `${log.amazonAccount.marketplace} - ${log.amazonAccount.sellerId}`
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-green-600">{log.recordsSynced} synced</span>
                        {log.recordsFailed > 0 && (
                          <span className="text-red-600 ml-2">{log.recordsFailed} failed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {duration !== null ? `${duration}s` : 'In progress'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

