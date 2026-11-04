import { useGetCampaignSyncStateQuery, useStartCampaignSyncMutation } from '@/services/api/campaignPerformance.api'
import { useSyncRowSelection } from './use-sync-row-selection'

/** Report Sync Management of the Campaign Performance sync: its state, row selection and the start of a run. */
export function useCampaignSyncManagement() {
  const { data, isLoading, isFetching } = useGetCampaignSyncStateQuery()
  const [startSync, { isLoading: isSubmitting }] = useStartCampaignSyncMutation()
  const selection = useSyncRowSelection()

  /** Starts the sync from the chosen start date to yesterday. Throws with the API's message on failure. */
  const applyReset = async () => {
    const startDate = selection.selectedEntries[0]?.[1].startDate
    if (!startDate) throw new Error('Pick a start date')
    try {
      const result = await startSync({ startDate }).unwrap()
      selection.clearSelection()
      return result
    } catch (error: any) {
      throw new Error(error?.data?.message || error?.message || 'Failed to start the sync')
    }
  }

  return { state: data, isLoading, isFetching, isSubmitting, ...selection, applyReset }
}
