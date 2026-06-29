'use client'

import React, { useState } from 'react'
import { useTriggerSyncMutation } from '@/services/api/sync.api'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { Button } from '@/design-system/buttons'
import { Card } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSyncStatus, setActiveSync } from '@/store/amazon.slice'
import type { SyncType } from '@/store/amazon.slice'

/**
 * SyncDashboard Component
 * 
 * Dashboard for triggering and monitoring Amazon data syncs
 * Features:
 * - Trigger manual syncs for each data type
 * - Show last sync status per account
 * - Display sync progress
 * - Show errors clearly
 */

interface SyncButtonProps {
  type: SyncType
  label: string
  description: string
  accountId: string
  onSync: (accountId: string, type: SyncType) => Promise<void>
  isSyncing: boolean
  lastSync?: string
  error?: string
}

const SyncButton: React.FC<SyncButtonProps> = ({
  type,
  label,
  description,
  accountId,
  onSync,
  isSyncing,
  lastSync,
  error,
}) => {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{label}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSync(accountId, type)}
          disabled={isSyncing}
          isLoading={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        {lastSync && (
          <span className="text-gray-600">
            Last sync: {new Date(lastSync).toLocaleString()}
          </span>
        )}
        {error && (
          <Badge variant="error" className="text-xs">
            Error
          </Badge>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export const SyncDashboard: React.FC = () => {
  const dispatch = useAppDispatch()
  const { data: accounts, isLoading: isLoadingAccounts } = useGetAmazonAccountsQuery()
  const activeAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)
  const syncStatus = useAppSelector((state) => state.amazon.syncStatus)
  const activeSyncs = useAppSelector((state) => state.amazon.activeSyncs)

  // Mutation
  const [triggerSync] = useTriggerSyncMutation()

  /**
   * Handle sync operation
   */
  const handleSync = async (accountId: string, type: SyncType) => {
    if (!accountId) {
      alert('Please select an Amazon account first')
      return
    }

    try {
      dispatch(setActiveSync({ accountId, type }))
      dispatch(setSyncStatus({ type, isSyncing: true, error: undefined }))

      const result = await triggerSync({
        amazonAccountId: accountId,
        syncType: type,
      }).unwrap()

      dispatch(
        setSyncStatus({
          type,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          error: undefined,
        })
      )
      dispatch(setActiveSync({ accountId, type: null }))

      alert(`Sync job started! Job ID: ${result.data.jobId}`)
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.message || 'Sync failed'
      dispatch(
        setSyncStatus({
          type,
          isSyncing: false,
          error: errorMessage,
        })
      )
      dispatch(setActiveSync({ accountId, type: null }))
      alert(`Sync failed: ${errorMessage}`)
    }
  }

  if (isLoadingAccounts) {
    return (
      <Card className="p-6">
        <Spinner />
      </Card>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg mb-4">No Amazon accounts linked.</p>
          <p className="text-gray-400 text-sm">
            Link your Amazon Seller Central account to start syncing data.
          </p>
        </div>
      </Card>
    )
  }

  const selectedAccountId = activeAccountId || accounts[0]?.id
  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId)

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Amazon Data Sync</h2>
        {selectedAccount && (
          <p className="text-gray-600">
            Syncing data for <strong>{selectedAccount.marketplace}</strong> account (
            {selectedAccount.sellerId})
          </p>
        )}
      </div>

      <div className="space-y-4">
        <SyncButton
          type="orders"
          label="Orders"
          description="Sync sales and orders from Amazon"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.orders.isSyncing || activeSyncs[selectedAccountId] === 'orders'}
          lastSync={syncStatus.orders.lastSync}
          error={syncStatus.orders.error}
        />

        <SyncButton
          type="fees"
          label="Fees"
          description="Sync referral, FBA, storage, removal, and disposal fees"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.fees.isSyncing || activeSyncs[selectedAccountId] === 'fees'}
          lastSync={syncStatus.fees.lastSync}
          error={syncStatus.fees.error}
        />

        <SyncButton
          type="ppc"
          label="PPC Metrics"
          description="Sync campaign, ad group, and keyword-level PPC metrics"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.ppc.isSyncing || activeSyncs[selectedAccountId] === 'ppc'}
          lastSync={syncStatus.ppc.lastSync}
          error={syncStatus.ppc.error}
        />

        <SyncButton
          type="inventory"
          label="Inventory"
          description="Sync inventory levels and stock quantities"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.inventory.isSyncing || activeSyncs[selectedAccountId] === 'inventory'}
          lastSync={syncStatus.inventory.lastSync}
          error={syncStatus.inventory.error}
        />

        <SyncButton
          type="listings"
          label="Listings"
          description="Sync listing changes and Buy Box status"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.listings.isSyncing || activeSyncs[selectedAccountId] === 'listings'}
          lastSync={syncStatus.listings.lastSync}
          error={syncStatus.listings.error}
        />

        <SyncButton
          type="refunds"
          label="Refunds"
          description="Sync refunds and returns data"
          accountId={selectedAccountId}
          onSync={handleSync}
          isSyncing={syncStatus.refunds.isSyncing || activeSyncs[selectedAccountId] === 'refunds'}
          lastSync={syncStatus.refunds.lastSync}
          error={syncStatus.refunds.error}
        />
      </div>
    </Card>
  )
}
