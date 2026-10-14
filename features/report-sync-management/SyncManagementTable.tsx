'use client'

import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { Spinner } from '@/design-system/loaders'
import type { RowSelectionState } from '@/hooks/use-sync-row-selection'

/**
 * Report Sync Management table: one collapsible group per channel (Amazon, Walmart, ...), each listing its sync jobs
 * by type and mode. Every group keeps its own selection; the page resets each group through its own API.
 */

export type SyncMode = 'live' | 'backfill'

export interface SyncTableRow {
  key: string
  label: string
  mode: SyncMode
  /** Markets the sync covers, shown under its name (channel syncs). */
  markets?: string[]
  status: string
  errorMessage?: string | null
  currentStart: string | null
  /** False for syncs that always read everything: a reset just runs them again. */
  hasStartDate: boolean
}

export interface SyncTableGroup {
  id: string
  title: string
  rows: SyncTableRow[]
  selectionMap: Record<string, RowSelectionState>
  onToggle: (key: string, defaultDate: string) => void
  onDateChange: (key: string, range: DateRangeValue) => void
  isLoading: boolean
  emptyText?: string
}

interface SyncManagementTableProps {
  groups: SyncTableGroup[]
  isBusy: boolean
  busyText: string
}

const COLUMN_COUNT = 6

const getDefaultDateStr = (dateVal: string | null | undefined): string => {
  if (!dateVal) return '2026-09-01'
  return dateVal.split('T')[0]
}

const formatDisplayDateWithTimezone = (dateVal: string | null | undefined): string => {
  if (!dateVal) return 'N/A'
  try {
    return format(parseISO(dateVal), 'MMM dd, yyyy (z)')
  } catch {
    return dateVal
  }
}

export const SyncManagementTable: React.FC<SyncManagementTableProps> = ({ groups, isBusy, busyText }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleGroup = (id: string) => setCollapsed((previous) => ({ ...previous, [id]: !previous[id] }))

  return (
    <div className="relative border rounded-lg bg-white shadow-sm overflow-visible">
      {isBusy && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center gap-3 rounded-lg min-h-[280px]">
          <Spinner size="lg" />
          <span className="text-sm font-semibold text-gray-800">{busyText}</span>
        </div>
      )}

      {/* The date picker popup must overflow the card, so scrolling is only kept where the table does not fit */}
      <div className="ds-scroll-x md:overflow-visible">
        <table className="w-full text-left border-collapse overflow-visible">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider relative z-0">
              <th className="py-3 px-4 w-12 text-center rounded-tl-lg">Select</th>
              <th className="py-3 px-4 w-44">Sync Type</th>
              <th className="py-3 px-4 w-28">Mode</th>
              <th className="py-3 px-4 w-28">Status</th>
              <th className="py-3 px-4 text-center">Current Start Date</th>
              <th className="py-3 px-4 w-52 rounded-tr-lg">New Start Date</th>
            </tr>
          </thead>

          {groups.map((group) => {
            const isOpen = !collapsed[group.id]
            const selectedCount = group.rows.filter((row) => group.selectionMap[row.key]?.selected).length

            return (
              <tbody key={group.id} className="divide-y divide-gray-200 text-sm overflow-visible border-b last:border-b-0">
                {/* Group header: opens / closes the channel's syncs */}
                <tr className="bg-gray-50/70 hover:bg-gray-100 cursor-pointer select-none" onClick={() => toggleGroup(group.id)}>
                  <td colSpan={COLUMN_COUNT} className="py-2.5 px-4">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-2 text-left font-semibold text-gray-900"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span>{group.title}</span>
                      <span className="text-xs font-normal text-gray-500">
                        {group.isLoading
                          ? 'Loading…'
                          : `${group.rows.length} sync${group.rows.length === 1 ? '' : 's'}${selectedCount ? ` · ${selectedCount} selected` : ''}`}
                      </span>
                    </button>
                  </td>
                </tr>

                {isOpen && !group.isLoading && group.rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-4 px-4 text-center text-gray-500">
                      {group.emptyText ?? 'No syncs configured.'}
                    </td>
                  </tr>
                )}

                {isOpen &&
                  group.rows.map((row) => {
                    const defaultDateStr = getDefaultDateStr(row.currentStart)
                    const currentSelection = group.selectionMap[row.key]
                    const isChecked = !!currentSelection?.selected
                    const selectedDateStr = currentSelection?.startDate || defaultDateStr
                    const datePickerValue: DateRangeValue = { startDate: selectedDateStr, endDate: selectedDateStr }

                    return (
                      <tr key={row.key} className={`transition-colors ${isChecked ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isBusy}
                            onChange={() => group.onToggle(row.key, defaultDateStr)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        <td className="py-3 px-4 pl-8">
                          <div className="font-semibold text-gray-800">{row.label}</div>
                          {row.markets && row.markets.length > 0 && (
                            <div className="text-xs text-gray-500 uppercase">{row.markets.join(' · ')}</div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${
                              row.mode === 'live' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {row.mode}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            title={row.errorMessage || undefined}
                            className={`font-mono text-xs uppercase font-semibold px-2 py-0.5 rounded ${
                              row.status === 'error' ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-100'
                            }`}
                          >
                            {row.status || 'idle'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center text-gray-600 font-medium whitespace-nowrap">
                          {row.hasStartDate ? formatDisplayDateWithTimezone(row.currentStart) : 'Full sync'}
                        </td>

                        <td className="py-3 px-4 relative overflow-visible">
                          {row.hasStartDate ? (
                            <div className={`inline-block relative ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
                              <DateRangePicker
                                selectionMode="single"
                                disableFutureDates={true}
                                showPresets={false}
                                value={datePickerValue}
                                onChange={(range) => group.onDateChange(row.key, range)}
                                displayFormat="MMM d, yyyy"
                                placeholder="Select Date"
                                placement="right"
                                triggerClassName="w-44 [&>span]:flex-1 [&>span]:text-left"
                              />
                            </div>
                          ) : (
                            // Same height as the date picker, so every row lines up
                            <span className="flex h-11 items-center text-xs text-gray-500">Select to run it again now</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}
