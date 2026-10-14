// src/hooks/useReportSyncManagement.ts

import { useState, useMemo } from 'react'
import {
  useGetSyncStatesQuery,
  useResetSyncStateMutation,
  AmazonSyncStateRow,
} from '@/services/api/report-sync-management.api'
import { useSyncRowSelection } from './use-sync-row-selection'

export type { RowSelectionState } from './use-sync-row-selection'

export interface UserMessage {
  text: string
  isError?: boolean
}

export function useReportSyncManagement() {
  const { data: syncData, isLoading, isFetching, refetch } = useGetSyncStatesQuery()
  const [resetSyncState, { isLoading: isSubmitting }] = useResetSyncStateMutation()
  const { selectionMap, toggleRowSelection, updateRowDate, selectedEntries, hasSelection, clearSelection } =
    useSyncRowSelection()

  const [message, setMessage] = useState<UserMessage | null>(null)

  // Safely extract rows from response
  const syncStates: AmazonSyncStateRow[] = useMemo(() => {
    return syncData?.success && Array.isArray(syncData.data) ? syncData.data : []
  }, [syncData])

  // Extract unique sync types (e.g. 'ads', 'fees', 'orders')
  const groupedTypes = useMemo(() => {
    return Array.from(new Set(syncStates.map((s) => s.syncType)))
  }, [syncStates])

  // Submit reset request for all selected items
  const applyReset = async () => {
    const selectedItems = selectedEntries.map(([key, value]) => {
      const [syncType, mode] = key.split(':')
      return {
        syncType,
        mode: mode as 'live' | 'backfill',
        startDate: value.startDate,
      }
    })

    if (selectedItems.length === 0) {
      const emptyError = new Error('Please select at least one row to reset.')
      setMessage({ text: emptyError.message, isError: true })
      throw emptyError
    }

    setMessage(null)

    try {
      const result = await resetSyncState({ items: selectedItems }).unwrap()

      if (result.success) {
        setMessage({ text: result.message || 'Sync states reset successfully!' })
        clearSelection()
        return result
      } else {
        const apiError = new Error(result.message || 'Failed to reset sync state')
        setMessage({ text: apiError.message, isError: true })
        // Throw error so UI caller handles error toast properly
        throw apiError
      }
    } catch (e: any) {
      const errorMessage =
        e?.data?.message || e?.message || e?.data?.error || 'Unknown error occurred'

      setMessage({
        text: `Request failed: ${errorMessage}`,
        isError: true,
      })

      // Re-throw so page-level try/catch triggers error toast
      throw new Error(errorMessage)
    }
  }

  return {
    syncStates,
    groupedTypes,
    selectionMap,
    hasSelection,
    isLoading,
    isFetching,
    isSubmitting,
    message,
    refetch,
    toggleRowSelection,
    updateRowDate,
    applyReset,
  }
}
