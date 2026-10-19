import type { useChannelSyncManagement } from '@/hooks/use-channel-sync-management'
import type { ChannelSyncStateRow } from '@/services/api/report-sync-management.api'
import type { SyncTableGroup, SyncTableRow } from './SyncManagementTable'

/** One channel's sync state, row selection and reset (from `useChannelSyncManagement`). */
export type ChannelSyncManagement = ReturnType<typeof useChannelSyncManagement>

/** How a channel's syncs are shown on the Report Sync Management page. A new channel = one entry here. */
export interface ChannelSyncGroupConfig {
  /** Lowercase channel id the backend uses, e.g. `walmart`. */
  channel: string
  title: string
  emptyText: string
}

export const CHANNEL_SYNC_GROUPS = {
  walmart: {
    channel: 'walmart',
    title: 'Walmart',
    emptyText: 'No Walmart market is connected (no Walmart credentials configured).',
  },
  shopify: {
    channel: 'shopify',
    title: 'Shopify',
    emptyText: 'No Shopify store is connected (no Shopify credentials configured).',
  },
  wayfair: {
    channel: 'wayfair',
    title: 'Wayfair',
    emptyText: 'Wayfair is not connected (no Wayfair API credentials configured).',
  },
} satisfies Record<string, ChannelSyncGroupConfig>

/** A channel sync row (one data type and mode, covering every market / store) as a table row. */
const toTableRow = (row: ChannelSyncStateRow): SyncTableRow => ({
  key: row.key,
  label: row.label,
  mode: row.mode,
  markets: row.markets,
  status: row.status,
  errorMessage: row.errorMessage,
  currentStart: row.currentStart,
  hasStartDate: row.resetKind === 'date',
})

export function toChannelSyncGroup(config: ChannelSyncGroupConfig, sync: ChannelSyncManagement): SyncTableGroup {
  return {
    id: config.channel,
    title: config.title,
    rows: sync.rows.map(toTableRow),
    selectionMap: sync.selectionMap,
    onToggle: sync.toggleRowSelection,
    onDateChange: sync.updateRowDate,
    isLoading: sync.isLoading,
    emptyText: config.emptyText,
  }
}
