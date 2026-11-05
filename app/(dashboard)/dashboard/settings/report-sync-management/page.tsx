'use client'

import React from 'react'
import { useReportSyncManagement } from '@/hooks/user-report-sync-management'
import { useChannelSyncManagement } from '@/hooks/use-channel-sync-management'
import { useCampaignSyncManagement } from '@/hooks/use-campaign-sync-management'
import { Spinner } from '@/design-system/loaders'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { SyncManagementTable, type SyncTableRow } from '@/features/report-sync-management/SyncManagementTable'
import { CAMPAIGN_SYNC_KEY, toCampaignSyncRow } from '@/features/report-sync-management/campaign-sync-row'
import { CHANNEL_SYNC_GROUPS, toChannelSyncGroup } from '@/features/report-sync-management/channel-sync-groups'

type SyncMode = 'live' | 'backfill'

interface ManagedSyncJob {
  syncType: string
  label: string
  /** Modes that have a start date worth resetting. */
  modes: SyncMode[]
  /** False for snapshots of the present (no date window): a reset just runs them again. Default true. */
  hasStartDate?: boolean
}

const BOTH_MODES: SyncMode[] = ['live', 'backfill']

/** Every Amazon sync job that can be reset from this page. A new job is one entry here. */
const MANAGED_SYNC_JOBS: ManagedSyncJob[] = [
  { syncType: 'ads', label: 'Ads Report', modes: BOTH_MODES },
  { syncType: 'fees', label: 'Payment Report', modes: BOTH_MODES },
  { syncType: 'products', label: 'Products', modes: BOTH_MODES },
  { syncType: 'orders', label: 'Orders', modes: BOTH_MODES },
  // Amazon builds this report over a rolling month, so only its backfill has a start date to move back.
  { syncType: 'fba_long_term_storage_fee', label: 'Long-Term Storage Fees', modes: ['backfill'] },
  // Same one-month window: the backfill walks month by month to the current month.
  { syncType: 'fba_storage_fee', label: 'Monthly Storage Fees', modes: ['backfill'] },
  // Inventory screens. Channel Inventory reads the FBA snapshot; Channel INVP reads the daily ledger (and the snapshot for today); Inventory Aging reads Inventory Health.
  { syncType: 'fba_inventory', label: 'FBA Inventory (Channel Inventory)', modes: ['live'], hasStartDate: false },
  { syncType: 'inventory_ledger_daily', label: 'Daily Inventory Ledger (Channel INVP)', modes: BOTH_MODES },
  { syncType: 'fba_inventory_health', label: 'Inventory Health (Inventory Aging)', modes: ['live'], hasStartDate: false },
]

export default function ReportSyncManagementPage() {
  const dispatch = useAppDispatch()
  const amazon = useReportSyncManagement()
  // Channel syncs come from the API: one row per data type and mode, covering every connected market / store
  const walmart = useChannelSyncManagement(CHANNEL_SYNC_GROUPS.walmart.channel)
  const shopify = useChannelSyncManagement(CHANNEL_SYNC_GROUPS.shopify.channel)
  const wayfair = useChannelSyncManagement(CHANNEL_SYNC_GROUPS.wayfair.channel)
  const temu = useChannelSyncManagement(CHANNEL_SYNC_GROUPS.temu.channel)
  const campaign = useCampaignSyncManagement()
  const channels = [
    { config: CHANNEL_SYNC_GROUPS.walmart, sync: walmart },
    { config: CHANNEL_SYNC_GROUPS.shopify, sync: shopify },
    { config: CHANNEL_SYNC_GROUPS.wayfair, sync: wayfair },
    { config: CHANNEL_SYNC_GROUPS.temu, sync: temu },
  ]

  const amazonRows: SyncTableRow[] = MANAGED_SYNC_JOBS.flatMap(({ syncType, label, modes, hasStartDate = true }) =>
    modes.map((mode) => {
      const state = amazon.syncStates.find((s) => s.syncType === syncType && s.mode === mode)
      return {
        key: `${syncType}:${mode}`,
        label,
        mode,
        status: state?.status || 'idle',
        errorMessage: state?.errorMessage,
        currentStart: state?.lastStartDate ?? null,
        hasStartDate,
      }
    })
  )

  const isSubmitting = amazon.isSubmitting || campaign.isSubmitting || channels.some(({ sync }) => sync.isSubmitting)
  const isBusy = isSubmitting || amazon.isLoading || amazon.isFetching || campaign.isFetching || channels.some(({ sync }) => sync.isFetching)
  const busyText = isSubmitting ? 'Resetting queues and updating sync states...' : 'Loading sync states...'

  // Resets the selected rows of every group; each group calls its own API
  const handleApplyResetWithToast = async () => {
    if (!amazon.hasSelection && !campaign.hasSelection && !channels.some(({ sync }) => sync.hasSelection)) {
      dispatch(addNotification({ message: 'Please select at least one row to reset.', type: 'error' }))
      return
    }

    const resets = [
      amazon.hasSelection &&
        amazon.applyReset().then((res) => res?.message || 'Amazon reset completed. Active queues flushed and scheduler restarted.'),
      campaign.hasSelection && campaign.applyReset().then((res) => res.message),
      ...channels.map(({ sync }) => sync.hasSelection && sync.applyReset().then((res) => res.message)),
    ].filter((reset): reset is Promise<string> => !!reset)

    const results = await Promise.allSettled(resets)
    results.forEach((result) =>
      dispatch(
        addNotification(
          result.status === 'fulfilled'
            ? { message: result.value, type: 'success' }
            : {
                message: result.reason?.message || 'Failed to update sync states. Please try again.',
                type: 'error',
              }
        )
      )
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Sync Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reset sync start dates, flush pending jobs, and purge cached report keys, so a sync can re-run from an earlier date.
        </p>
      </div>

      <SyncManagementTable
        isBusy={isBusy}
        busyText={busyText}
        groups={[
          {
            id: 'amazon',
            title: 'Amazon',
            // The Campaign Performance row belongs to Amazon but has its own selection and reset
            rows: [...amazonRows, toCampaignSyncRow(campaign)],
            selectionMap: { ...amazon.selectionMap, ...campaign.selectionMap },
            onToggle: (key, defaultDate) =>
              key === CAMPAIGN_SYNC_KEY ? campaign.toggleRowSelection(key, defaultDate) : amazon.toggleRowSelection(key, defaultDate),
            onDateChange: (key, range) => (key === CAMPAIGN_SYNC_KEY ? campaign.updateRowDate(key, range) : amazon.updateRowDate(key, range)),
            isLoading: amazon.isLoading,
          },
          ...channels.map(({ config, sync }) => toChannelSyncGroup(config, sync)),
        ]}
      />

      {/* Footer Action */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleApplyResetWithToast}
          disabled={isBusy}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              <span>Resetting Queues & States...</span>
            </>
          ) : (
            'Update Selected Sync States'
          )}
        </button>
      </div>
    </div>
  )
}
