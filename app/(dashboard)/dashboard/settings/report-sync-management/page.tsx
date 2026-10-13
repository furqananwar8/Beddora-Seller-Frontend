'use client'

import React from 'react'
import { format, parseISO } from 'date-fns'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { useReportSyncManagement } from '@/hooks/user-report-sync-management'
import { Spinner } from '@/design-system/loaders'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

type SyncMode = 'live' | 'backfill'

interface ManagedSyncJob {
  syncType: string
  label: string
  /** Modes that have a start date worth resetting. */
  modes: SyncMode[]
}

const BOTH_MODES: SyncMode[] = ['live', 'backfill']

/** Every sync job that can be reset from this page. A new job is one entry here. */
const MANAGED_SYNC_JOBS: ManagedSyncJob[] = [
  { syncType: 'ads', label: 'Ads Report', modes: BOTH_MODES },
  { syncType: 'fees', label: 'Payment Report', modes: BOTH_MODES },
  { syncType: 'products', label: 'Products', modes: BOTH_MODES },
  { syncType: 'orders', label: 'Orders', modes: BOTH_MODES },
  // Amazon builds this report over a rolling month, so only its backfill has a start date to move back.
  { syncType: 'fba_long_term_storage_fee', label: 'Long-Term Storage Fees', modes: ['backfill'] },
]

const SYNC_TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(MANAGED_SYNC_JOBS.map(({ syncType, label }) => [syncType, label]))

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

  const rowsToRender = MANAGED_SYNC_JOBS.flatMap(({ syncType, modes }) => modes.map((mode) => ({ syncType, mode })))

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
    <div className="p-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Amazon Sync Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reset sync start dates, flush pending BullMQ jobs, and purge cached report keys, so a sync can re-run from an earlier date.
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

        {/* The date picker popup must overflow the card, so scrolling is only kept where the table does not fit */}
        <div className="ds-scroll-x md:overflow-visible">
        <table className="w-full text-left border-collapse overflow-visible">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider relative z-0">
              <th className="py-3 px-4 w-12 text-center rounded-tl-lg">Select</th>
              <th className="py-3 px-4 w-36">Sync Type</th>
              <th className="py-3 px-4 w-28">Mode</th>
              <th className="py-3 px-4 w-28">Status</th>
              <th className="py-3 px-4 text-center">Current Start Date</th>
              <th className="py-3 px-4 w-52 rounded-tr-lg">New Start Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm overflow-visible">
            {rowsToRender.map(({ syncType, mode }) => {
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

              return (
                <tr
                  key={key}
                  className={`transition-colors ${
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
                  <td className="py-3 px-4 relative overflow-visible">
                    <div className={`inline-block relative ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
                      <DateRangePicker
                        selectionMode="single"
                        disableFutureDates={true}
                        showPresets={false}
                        value={datePickerValue}
                        onChange={(range) => updateRowDate(key, range)}
                        displayFormat="MMM d, yyyy"
                        placeholder="Select Date"
                        placement="right"
                        triggerClassName="w-44 [&>span]:flex-1 [&>span]:text-left"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
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