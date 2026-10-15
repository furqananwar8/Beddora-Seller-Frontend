import {
  useGetChannelSyncStatesQuery,
  useResetChannelSyncsMutation,
  type ChannelSyncStateRow,
} from '@/services/api/report-sync-management.api'
import { useSyncRowSelection } from './use-sync-row-selection'

/** Sync management of one channel's syncs (e.g. Walmart, Shopify): its rows, row selection and reset. */
export function useChannelSyncManagement(channel: string) {
  const { data, isLoading, isFetching } = useGetChannelSyncStatesQuery(channel)
  const [resetChannelSyncs, { isLoading: isSubmitting }] = useResetChannelSyncsMutation()
  const selection = useSyncRowSelection()

  const rows: ChannelSyncStateRow[] = data ?? []

  /** Resets the selected rows; full syncs send no start date. Throws with the API's message on failure. */
  const applyReset = async () => {
    const items = selection.selectedEntries.map(([key, value]) => {
      const row = rows.find((candidate) => candidate.key === key)
      return row?.resetKind === 'full' ? { key } : { key, startDate: value.startDate }
    })
    try {
      const result = await resetChannelSyncs({ items }).unwrap()
      selection.clearSelection()
      return result
    } catch (error: any) {
      throw new Error(error?.data?.message || error?.message || 'Failed to reset the syncs')
    }
  }

  return { rows, isLoading, isFetching, isSubmitting, ...selection, applyReset }
}
