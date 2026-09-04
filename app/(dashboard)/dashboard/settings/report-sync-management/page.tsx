'use client'

import React, { useState } from 'react'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { useReportSyncManagement } from '@/hooks/user-report-sync-management'

const ALLOWED_SYNC_TYPES = ['ads', 'fees']

export default function ReportSyncManagementPage() {
  const {
    syncStates,
    selectionMap,
    isLoading,
    isFetching,
    isSubmitting,
    message,
    toggleRowSelection,
    updateRowDate,
    applyReset,
  } = useReportSyncManagement()

  // Track currently active/open DatePicker row key to elevate its z-index dynamically
  const [activePickerKey, setActivePickerKey] = useState<string | null>(null)

  const getDefaultDateStr = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '2026-09-01'
    return dateVal.split('T')[0]
  }

  const filteredSyncTypes = ALLOWED_SYNC_TYPES.filter((type) =>
    syncStates.some((s: any) => s.syncType === type)
  )

  // Pre-generate static row list to maintain consistent row indices
  const rowsToRender: Array<{ syncType: string; mode: 'live' | 'backfill' }> = []
  const targetSyncTypes = filteredSyncTypes.length > 0 ? filteredSyncTypes : ALLOWED_SYNC_TYPES

  targetSyncTypes.forEach((syncType) => {
    rowsToRender.push({ syncType, mode: 'live' })
    rowsToRender.push({ syncType, mode: 'backfill' })
  })

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans pb-64">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Amazon Sync Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reset sync start dates, flush pending BullMQ jobs, and purge cached report keys for Ads and Fees.
        </p>
      </div>

      {/* Alert */}
      {message && (
        <div
          className={`mb-4 p-3 text-sm rounded border ${
            message.isError
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500 bg-white border rounded-lg">
          Loading sync states...
        </div>
      ) : (
        <div className="border rounded-lg bg-white shadow-sm overflow-visible">
          <table className="w-full text-left border-collapse overflow-visible">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider relative z-0">
                <th className="py-3 px-4 w-12 text-center">Select</th>
                <th className="py-3 px-4">Sync Type</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Current Start Date</th>
                <th className="py-3 px-4 text-right">New Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm overflow-visible">
              {rowsToRender.map(({ syncType, mode }, rowIndex) => {
                const state = syncStates.find(
                  (s: any) => s.syncType === syncType && s.mode === mode
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

                // FIX: Dynamic Stacking Context
                // Active picker row gets highest z-index (z-50), inactive rows get decreasing base z-indexes (z-20, z-19, etc.)
                const isPickerOpen = activePickerKey === key
                const rowZIndex = isPickerOpen ? 'z-50' : ''
                const rowStyle = isPickerOpen ? { zIndex: 50 } : { zIndex: 20 - rowIndex }

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
                        onChange={() => toggleRowSelection(key, defaultDateStr)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Sync Type */}
                    <td className="py-3 px-4 font-semibold text-gray-800 capitalize">
                      {syncType.replace(/_/g, ' ')}
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
                    <td className="py-3 px-4 text-gray-600">
                      {state?.lastStartDate
                        ? new Date(state.lastStartDate).toLocaleDateString()
                        : 'N/A'}
                    </td>

                    {/* Date Picker Cell with Elevated Stacking */}
                    <td className="py-3 px-4 text-right relative overflow-visible">
                      <div
                        className="inline-block relative"
                        onFocus={() => setActivePickerKey(key)}
                        onClick={() =>
                          setActivePickerKey((prev) => (prev === key ? null : key))
                        }
                      >
                       <DateRangePicker
                        selectionMode="single"
                        disableFutureDates={true}
                        showPresets={false}
                        value={datePickerValue}
                        onChange={(range) => updateRowDate(key, range)}
                        displayFormat="MMM d, yyyy"
                        placeholder="Select date"
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
      )}

      {/* Footer Action */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={applyReset}
          disabled={isSubmitting || isLoading || isFetching}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting Queues & States...' : 'Update Selected Sync States'}
        </button>
      </div>
    </div>
  )
}