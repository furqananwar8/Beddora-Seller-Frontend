import type { useCampaignSyncManagement } from '@/hooks/use-campaign-sync-management'
import type { SyncTableRow } from './SyncManagementTable'

export const CAMPAIGN_SYNC_KEY = 'campaign-performance'

/** The Campaign Performance sync (Amazon Ads keywords and their ranks) as a row of the Amazon group. */
export function toCampaignSyncRow(sync: ReturnType<typeof useCampaignSyncManagement>): SyncTableRow {
  return {
    key: CAMPAIGN_SYNC_KEY,
    label: 'Campaign Performance',
    mode: 'backfill',
    status: sync.state?.status ?? 'idle',
    errorMessage: sync.state?.errorMessage,
    currentStart: sync.state?.startDate ?? null,
    hasStartDate: true,
  }
}
