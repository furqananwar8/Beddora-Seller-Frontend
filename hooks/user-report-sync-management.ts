// src/hooks/useReportSyncManagement.ts

import { useState, useMemo } from 'react'
import {
  useGetSyncStatesQuery,
  useResetSyncStateMutation,
  AmazonSyncStateRow,
} from '@/services/api/report-sync-management.api'
import { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

export interface RowSelectionState {
  selected: boolean
  startDate: string
}

export interface UserMessage {
  text: string
  isError?: boolean
}

export function useReportSyncManagement() {
  const { data: syncData, isLoading, isFetching, refetch } = useGetSyncStatesQuery()
  const [resetSyncState, { isLoading: isSubmitting }] = useResetSyncStateMutation()

  const [message, setMessage] = useState<UserMessage | null>(null)
  const [selectionMap, setSelectionMap] = useState<Record<string, RowSelectionState>>({})

  // Safely extract rows from response
  const syncStates: AmazonSyncStateRow[] = useMemo(() => {
    return syncData?.success && Array.isArray(syncData.data) ? syncData.data : []
  }, [syncData])

  // Extract unique sync types (e.g. 'ads', 'fees', 'orders')
  const groupedTypes = useMemo(() => {
    return Array.from(new Set(syncStates.map((s) => s.syncType)))
  }, [syncStates])

  // Toggle selection for a row
  const toggleRowSelection = (key: string, defaultDate: string) => {
    setSelectionMap((prev) => ({
      ...prev,
      [key]: {
        selected: !prev[key]?.selected,
        startDate: prev[key]?.startDate || defaultDate,
      },
    }))
  }

  // Update selected date for a row (and auto-select it)
  const updateRowDate = (key: string, range: DateRangeValue) => {
    const newDate = range.startDate || range.endDate
    if (!newDate) return

    setSelectionMap((prev) => ({
      ...prev,
      [key]: {
        selected: true,
        startDate: newDate,
      },
    }))
  }

  // Submit reset request for all selected items
  const applyReset = async () => {
    const selectedItems = Object.entries(selectionMap)
      .filter(([_, value]) => value.selected && value.startDate)
      .map(([key, value]) => {
        const [syncType, mode] = key.split(':')
        return {
          syncType,
          mode: mode as 'live' | 'backfill',
          startDate: value.startDate,
        }
      })

    if (selectedItems.length === 0) {
      alert('Please select at least one row to reset.')
      return
    }

    setMessage(null)

    try {
      const result = await resetSyncState({ items: selectedItems }).unwrap()
      if (result.success) {
        setMessage({ text: result.message || 'Sync states reset successfully!' })
        setSelectionMap({})
      } else {
        setMessage({ text: `Error: ${result.message}`, isError: true })
      }
    } catch (e: any) {
      setMessage({
        text: `Request failed: ${e?.data?.message || e?.message || 'Unknown error'}`,
        isError: true,
      })
    }
  }

  return {
    syncStates,
    groupedTypes,
    selectionMap,
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