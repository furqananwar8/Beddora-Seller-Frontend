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
  mapPresets,
} from '@/utils/profitDashboard.util'

import { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { MapComponent } from './components'

// ────────────────────────────────────────────────────────
// Marketplace to Currency Lookup Object
// ────────────────────────────────────────────────────────

const MARKETPLACE_CURRENCY_MAP: Record<string, CurrencyCode> = {
  // Canada
  'amazon.ca': 'CAD',
  'canada': 'CAD',
  'ca': 'CAD',

  // USA
  'amazon.com': 'USD',
  'usa': 'USD',
  'us': 'USD',

  // Mexico
  'amazon.com.mx': 'EUR',
  'amazon.mx': 'EUR',
  'mexico': 'EUR',
  'mx': 'EUR',
}

const getDefaultCurrencyForMarketplaces = (
  marketplaces: string[],
  fallback: CurrencyCode = 'CAD'
): CurrencyCode => {
  if (!marketplaces || marketplaces.length === 0) return fallback

  const primary = marketplaces[0].trim().toLowerCase()

  // O(1) Direct Object Lookup
  if (MARKETPLACE_CURRENCY_MAP[primary]) {
    return MARKETPLACE_CURRENCY_MAP[primary]
  }

  // Fallback fuzzy search on object keys
  const matchedKey = Object.keys(MARKETPLACE_CURRENCY_MAP).find((key) =>
    primary.includes(key)
  )

  return matchedKey ? MARKETPLACE_CURRENCY_MAP[matchedKey] : fallback
}

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
  appliedMarketplaces: parentAppliedMarketplaces,
  appliedCurrency: parentAppliedCurrency,
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

  // Initial default date range
  const initialDateRange = useMemo(
    () => ({
      startDate: toISODatePST(addDaysPST(nowInPST(), -29)),
      endDate: toISODatePST(nowInPST()),
      presetId: 'last-30-days',
      periodicity: 'day',
    }),
    [],
  )

  // Draft states (staged until filter button click)
  const [draftDateRange, setDraftDateRange] = useState<
    DateRangeValue & { periodicity?: string }
  >(initialDateRange)

  const [draftMarketplaces, setDraftMarketplaces] = useState<string[]>(
    parentAppliedMarketplaces
  )
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>(
    parentAppliedCurrency || 'CAD'
  )

  // Applied states (triggers API refetches for MapComponent)
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRangeValue & { periodicity?: string }
  >(initialDateRange)
  const [appliedMarketplacesState, setAppliedMarketplacesState] = useState<string[]>(
    draftMarketplaces
  )
  const [appliedCurrencyState, setAppliedCurrencyState] = useState<CurrencyCode>(
    draftCurrency
  )

  // ──────────────────────────────
  // Draft Handlers
  // ──────────────────────────────

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    const preset = chartPresets.find((item) => item.id === range.presetId)

    const periodicity =
      preset?.getRange().periodicity ||
      inferPeriodicity(range.startDate as string, range.endDate as string)

    setDraftDateRange({ ...range, periodicity })
  }, [])

  const handleDraftMarketplacesChange = useCallback(
    (value: string[]) => {
      // Set draft marketplaces directly
      setDraftMarketplaces(value)

      // Auto-detect currency if marketplaces are selected
      if (value.length > 0) {
        const autoCurrency = getDefaultCurrencyForMarketplaces(value, draftCurrency)
        setDraftCurrency(autoCurrency)
      }
    },
    [draftCurrency]
  )

  const handleDraftCurrencyChange = useCallback((value: string) => {
    setDraftCurrency(value as CurrencyCode)
  }, [])

  // ──────────────────────────────
  // Apply / Filter trigger
  // ──────────────────────────────

  const handleApplyTileFilters = useCallback(() => {
    // 1. Commit draft states to applied state
    setAppliedDateRange(draftDateRange)
    setAppliedMarketplacesState([...draftMarketplaces])
    setAppliedCurrencyState(draftCurrency)

    // 2. Sync parent props and Redux store
    onMarketplacesChange([...draftMarketplaces])
    onCurrencyChange(draftCurrency)

    dispatch(
      setFilters({
        ...profitFilters,
        startDate: draftDateRange.startDate as string,
        endDate: draftDateRange.endDate as string,
        periodicity: draftDateRange.periodicity as any,
        marketplaces: [...draftMarketplaces],
        currency: draftCurrency,
      }),
    )

    // 3. Force refresh key for header date picker
    setDatePickerKey((k) => k + 1)
  }, [
    draftDateRange,
    draftMarketplaces,
    draftCurrency,
    onMarketplacesChange,
    onCurrencyChange,
    dispatch,
    profitFilters,
  ])

  // Value passed into header date picker input
  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({
      startDate: draftDateRange.startDate,
      endDate: draftDateRange.endDate,
      presetId: draftDateRange.presetId,
      periodicity: draftDateRange.periodicity || 'day',
    }),
    [draftDateRange],
  )

  // Active marketplaces passed to MapComponent
  const mapMarketplaces = useMemo(
    () => (appliedMarketplacesState.length ? appliedMarketplacesState : ALL_MARKETPLACES),
    [appliedMarketplacesState],
  )

  return (
    <>
      {/* ── Header ── */}
      <ProfitDashboardHeader
        isFiltering={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRangeValue}
        datePresets={mapPresets}
        keepOpenPresetIds={['custom']}
        onDateRangeChange={handleDateRangeChange}
        dateDisplayFormat="MMM d, yyyy"
        datePlaceholder="Select date range"
        marketplaces={draftMarketplaces}
        onMarketplacesChange={handleDraftMarketplacesChange}
        currency={draftCurrency}
        onCurrencyChange={handleDraftCurrencyChange}
        currencyOptions={[
          { value: 'CAD', label: 'CAD' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ]}
        onFilter={handleApplyTileFilters}
        searchWidth="w-[45%]"
        datePickerKey={datePickerKey}
      />

      {/* ── Map Content ── */}
      <MapComponent
        accountId={effectiveAccountId}
        dateRange={appliedDateRange}
        searchTerm={searchTerm}
        selectedMarketplaces={mapMarketplaces}
        currency={appliedCurrencyState}
      />
    </>
  )
}

export default MapTab