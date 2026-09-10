'use client'

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react'

import {
  Card,
  CardContent,
} from '@/design-system/cards'

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'

import {
  useGetProfitByProductQuery,
  useGetProfitByOrderItemsQuery,
} from '@/services/api/profit.api'

import {
  useGetDashboardChartQuery,
  ChartPeriod,
} from '@/services/api/charts.api'

import { useDebounce } from '@/utils/debounce'

import {
  chartPresets,
  inferPeriodicity,
  nowInPST,
  toISODatePST,
  addDaysPST,
  ALL_MARKETPLACES,
  type CurrencyCode,
  type TableView,
} from '@/utils/profitDashboard.util'

import { MARKETPLACES } from '@/utils/marketplaces'

import {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'
import { ChartSummaryTable } from './components'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { DashboardChart } from './DashboardChart'
import { OrderItemsTable } from './OrderItemsTable'
import { SellerboardProductsTable } from './SellerboardProductsTable'

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

  // Fallback fuzzy search on object keys (if partial match like "Amazon Canada")
  const matchedKey = Object.keys(MARKETPLACE_CURRENCY_MAP).find((key) =>
    primary.includes(key)
  )

  return matchedKey ? MARKETPLACE_CURRENCY_MAP[matchedKey] : fallback
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ChartTabProps {
  effectiveAccountId: string | undefined
  appliedMarketplaces: string[]
  appliedCurrency: CurrencyCode
  onMarketplacesChange: (value: string[]) => void
  onCurrencyChange: (value: CurrencyCode) => void
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const ChartTab: React.FC<ChartTabProps> = ({
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [tableView, setTableView] = useState<TableView>('products')
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

  // Applied states (triggers API refetches)
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
      // Set draft marketplaces directly (allows empty array [])
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

  // ──────────────────────────────
  // Chart queries (Depend strictly on applied state)
  // ──────────────────────────────

  const chartFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplacesState,
      startDate: appliedDateRange.startDate,
      endDate: appliedDateRange.endDate,
      period: (appliedDateRange.periodicity || 'day') as ChartPeriod,
      currency: appliedCurrencyState,
    }),
    [
      effectiveAccountId,
      appliedMarketplacesState,
      appliedDateRange,
      appliedCurrencyState,
    ],
  )

  const {
    data: chartData,
    isFetching: chartFetching,
    error: chartError,
  } = useGetDashboardChartQuery(chartFilters as any, {
    skip: !effectiveAccountId,
  })

  // ──────────────────────────────
  // Product & Order Item queries
  // ──────────────────────────────

  const activeRange = useMemo(
    () => ({
      startDate: appliedDateRange.startDate || undefined,
      endDate: appliedDateRange.endDate || undefined,
    }),
    [appliedDateRange],
  )

  const { data: productData, isFetching: productFetching } =
    useGetProfitByProductQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplacesState,
        currency: appliedCurrencyState,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      },
      {
        skip: !effectiveAccountId || tableView === 'order-items',
      },
    )

  const { data: orderItemsData, isFetching: orderItemsFetching } =
    useGetProfitByOrderItemsQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplacesState,
        currency: appliedCurrencyState,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      },
      {
        skip: !effectiveAccountId || tableView === 'products',
      },
    )

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

  // ──────────────────────────────
  // Render
  // ──────────────────────────────

  return (
    <>
      {/* ── Header ── */}
      <ProfitDashboardHeader
        isFiltering={chartFetching}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRangeValue}
        datePresets={chartPresets}
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

      {/* ── Chart + Summary ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        style={{ gridAutoRows: '1fr' }}
      >
        <div className="lg:col-span-2 h-full">
          <DashboardChart
            data={chartData}
            isLoading={chartFetching}
            error={chartError}
            currency={appliedCurrencyState}
          />
        </div>

        <div className="lg:col-span-1 h-full">
          <ChartSummaryTable
            data={chartData?.summary}
            isLoading={chartFetching}
            currency={appliedCurrencyState}
            startDate={chartData?.startDate || ''}
            endDate={chartData?.endDate || ''}
          />
        </div>
      </div>

      {/* ── Products Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-text-primary">
                All Periods
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setTableView('products')}
                  className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                    tableView === 'products'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  Products
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {tableView === 'products' ? (
              <SellerboardProductsTable
                products={productData}
                isLoading={productFetching}
                isFetching={productFetching}
                searchTerm={debouncedSearchTerm}
              />
            ) : (
              <OrderItemsTable
                orderItems={orderItemsData}
                isLoading={orderItemsFetching}
                searchTerm={debouncedSearchTerm}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default ChartTab