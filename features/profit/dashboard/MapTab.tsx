'use client'

import React, { useCallback, useMemo, useState } from 'react'

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'



import {
  chartPresets,
  inferPeriodicity,
  nowInPST,
  toISODatePST,
  addDaysPST,
  ALL_MARKETPLACES,
  type CurrencyCode,
} from '@/utils/profitDashboard.util'

import { MARKETPLACES } from '@/utils/marketplaces'

import { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { MapComponent } from './components'

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface MapTabProps {
  effectiveAccountId: string | undefined
  appliedMarketplaces: string[]
  appliedCurrency: CurrencyCode
  onMarketplacesChange: (value: string[]) => void
  onCurrencyChange: (value: CurrencyCode) => void
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const MapTab: React.FC<MapTabProps> = ({
  effectiveAccountId,
  appliedMarketplaces,
  appliedCurrency,
  onMarketplacesChange,
  onCurrencyChange,
}) => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)

  // ──────────────────────────────
  // Local state
  // ──────────────────────────────

  const [searchTerm, setSearchTerm] = useState('')
  const [datePickerKey, setDatePickerKey] = useState(0)

  const [dateRange, setDateRange] = useState<
    DateRangeValue & { periodicity?: string }
  >({
    startDate: toISODatePST(addDaysPST(nowInPST(), -29)),
    endDate: toISODatePST(nowInPST()),
    presetId: 'last-30-days',
    periodicity: 'day',
  })

  // ──────────────────────────────
  // Handlers
  // ──────────────────────────────

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    const preset = chartPresets.find((item) => item.id === range.presetId)
    const periodicity =
      preset?.getRange().periodicity ||
      inferPeriodicity(range.startDate as string, range.endDate as string)
    setDateRange({ ...range, periodicity })
  }, [])

  const handleMarketplacesChange = useCallback(
    (value: string[]) => {
      const marketplaces =
        value.length > 0 ? [...value] : MARKETPLACES.map((m) => m.id)
      onMarketplacesChange(marketplaces)
      dispatch(setFilters({ ...profitFilters, marketplaces }))
    },
    [dispatch, profitFilters, onMarketplacesChange],
  )

  const handleCurrencyChange = useCallback(
    (value: string) => {
      const currency = value as CurrencyCode
      onCurrencyChange(currency)
      dispatch(setFilters({ ...profitFilters, currency }))
    },
    [dispatch, profitFilters, onCurrencyChange],
  )

  const handleApply = useCallback(() => {
    setDatePickerKey((k) => k + 1)
  }, [])

  // ──────────────────────────────
  // Date range value for picker
  // ──────────────────────────────

  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      presetId: dateRange.presetId,
      periodicity: dateRange.periodicity || 'day',
    }),
    [dateRange],
  )

  // ──────────────────────────────
  // Render
  // ──────────────────────────────

  return (
    <>
      <ProfitDashboardHeader
        isFiltering={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRangeValue}
        datePresets={chartPresets}
        keepOpenPresetIds={['custom']}
        onDateRangeChange={handleDateRangeChange}
        dateDisplayFormat="MMM d, yyyy"
        datePlaceholder="Select date range"
        marketplaces={appliedMarketplaces}
        onMarketplacesChange={handleMarketplacesChange}
        currency={appliedCurrency}
        onCurrencyChange={handleCurrencyChange}
        currencyOptions={[
          { value: 'CAD', label: 'CAD' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ]}
        onFilter={handleApply}
        searchWidth="w-[45%]"
        datePickerKey={datePickerKey}
      />

      <MapComponent accountId={effectiveAccountId} />
    </>
  )
}

export default MapTab