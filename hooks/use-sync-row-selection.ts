import { useState } from 'react'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

/** Row selection of a sync management table: which rows are ticked and the start date picked for each. */

export interface RowSelectionState {
  selected: boolean
  startDate: string
}

export function useSyncRowSelection() {
  const [selectionMap, setSelectionMap] = useState<Record<string, RowSelectionState>>({})

  const toggleRowSelection = (key: string, defaultDate: string) => {
    setSelectionMap((prev) => ({
      ...prev,
      [key]: {
        selected: !prev[key]?.selected,
        startDate: prev[key]?.startDate || defaultDate,
      },
    }))
  }

  /** Picking a date also ticks the row. */
  const updateRowDate = (key: string, range: DateRangeValue) => {
    const newDate = range.startDate || range.endDate
    if (!newDate) return
    setSelectionMap((prev) => ({ ...prev, [key]: { selected: true, startDate: newDate } }))
  }

  const selectedEntries = Object.entries(selectionMap).filter(([, value]) => value.selected && value.startDate)

  return {
    selectionMap,
    toggleRowSelection,
    updateRowDate,
    selectedEntries,
    hasSelection: selectedEntries.length > 0,
    clearSelection: () => setSelectionMap({}),
  }
}
