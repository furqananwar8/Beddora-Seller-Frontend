'use client'

import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { useReportSyncManagement } from '@/hooks/user-report-sync-management'
import { Spinner } from '@/design-system/loaders'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

const ALLOWED_SYNC_TYPES = ['ads', 'fees']

const SYNC_TYPE_LABEL_MAP: Record<string, string> = {
  ads: 'Ads Report',
  fees: 'Payment Report',
}

export default function ReportSyncManagementPage() {
  const dispatch = useAppDispatch()

  const {
    syncStates,
    selectionMap,
    isLoading,
    isFetching,
    isSubmitting,
    toggleRowSelection,
    updateRowDate,
    applyReset,
  } = useReportSyncManagement()

  const [activePickerKey, setActivePickerKey] = useState<string | null>(null)

  const getDefaultDateStr = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '2026-09-01'
    return dateVal.split('T')[0]
  }

  const formatDisplayDateWithTimezone = (dateVal: string | null | undefined): string => {
    if (!dateVal) return 'N/A'
    try {
      const d = parseISO(dateVal)
      return format(d, 'MMM dd, yyyy (z)')
    } catch {
      return dateVal
    }
  }

  const filteredSyncTypes = ALLOWED_SYNC_TYPES.filter((type) =>
    syncStates.some((s) => s.syncType === type)
  )

  const rowsToRender: Array<{ syncType: string; mode: 'live' | 'backfill' }> = []
  const targetSyncTypes = filteredSyncTypes.length > 0 ? filteredSyncTypes : ALLOWED_SYNC_TYPES

  targetSyncTypes.forEach((syncType) => {
    rowsToRender.push({ syncType, mode: 'live' })
    rowsToRender.push({ syncType, mode: 'backfill' })
  })

  // Redux notification dispatch handler
  const handleApplyResetWithToast = async () => {
    try {
      const res = await applyReset()

      dispatch(
        addNotification({
          message:
            res?.message ||
            'Reset completed. Active queues flushed and scheduler restarted.',
          type: 'success',
        })
      )
    } catch (err: any) {
      dispatch(
        addNotification({
          message:
            err?.message ||
            err?.data?.message ||
            'Failed to update sync states. Please try again.',
          type: 'error',
        })
      )
    }
  }

  const isBusy = isLoading || isSubmitting || isFetching

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans pb-64">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Amazon Sync Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reset sync start dates, flush pending BullMQ jobs, and purge cached report keys for Ads and Fees.
        </p>
      </div>

      {/* Table Container */}
      <div className="relative border rounded-lg bg-white shadow-sm overflow-visible">
        {/* SOLID OVERLAY */}
        {isBusy && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center gap-3 rounded-lg min-h-[280px]">
            <Spinner size="lg" />
            <span className="text-sm font-semibold text-gray-800">
              {isSubmitting
                ? 'Resetting queues and updating sync states...'
                : 'Loading sync states...'}
            </span>
          </div>
        )}

        <table className="w-full text-left border-collapse overflow-visible">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider relative z-0">
              <th className="py-3 px-4 w-12 text-center rounded-tl-lg">Select</th>
              <th className="py-3 px-4 w-36">Sync Type</th>
              <th className="py-3 px-4 w-28">Mode</th>
              <th className="py-3 px-4 w-28">Status</th>
              <th className="py-3 px-4 text-center">Current Start Date</th>
              <th className="py-3 px-4 text-right w-48 rounded-tr-lg">New Start Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm overflow-visible">
            {rowsToRender.map(({ syncType, mode }, rowIndex) => {
              const state = syncStates.find(
                (s) => s.syncType === syncType && s.mode === mode
              )
              const key = `${syncType}:${mode}`
              const defaultDateStr = getDefaultDateStr(state?.lastStartDate)
              const currentSelection = selectionMap[key]
              const isChecked = !!currentSelection?.selected
              const selectedDateStr = currentSelection?.startDate || defaultDateStr

              const datePickerValue: DateRangeValue = {
                startDate: selectedDateStr,
                endDate: selectedDateStr,
              }

              const isPickerOpen = activePickerKey === key && !isBusy
              const rowZIndex = isPickerOpen ? 'z-40' : ''
              const rowStyle = isPickerOpen ? { zIndex: 40 } : { zIndex: 20 - rowIndex }

              return (
                <tr
                  key={key}
                  style={rowStyle}
                  className={`relative transition-colors ${rowZIndex} ${
                    isChecked ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isBusy}
                      onChange={() => toggleRowSelection(key, defaultDateStr)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>

                  {/* Sync Type */}
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    {SYNC_TYPE_LABEL_MAP[syncType] || syncType.replace(/_/g, ' ')}
                  </td>

                  {/* Mode */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${
                        mode === 'live'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {mode}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs uppercase font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {state?.status || 'idle'}
                    </span>
                  </td>

                  {/* Current Start Date */}
                  <td className="py-3 px-4 text-center text-gray-600 font-medium whitespace-nowrap">
                    {formatDisplayDateWithTimezone(state?.lastStartDate)}
                  </td>

                  {/* Date Picker Cell */}
                  <td className="py-3 px-4 text-right relative overflow-visible">
                    <div
                      className={`inline-block relative ${isBusy ? 'pointer-events-none opacity-50' : ''}`}
                      onFocus={() => !isBusy && setActivePickerKey(key)}
                      onClick={() =>
                        !isBusy && setActivePickerKey((prev) => (prev === key ? null : key))
                      }
                    >
                      <DateRangePicker
                        selectionMode="single"
                        disableFutureDates={true}
                        showPresets={false}
                        value={datePickerValue}
                        onChange={(range) => {
                          updateRowDate(key, range)
                          setActivePickerKey(null)
                        }}
                        displayFormat="MMM d, yyyy"
                        placeholder="Select Date"
                        placement="right"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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