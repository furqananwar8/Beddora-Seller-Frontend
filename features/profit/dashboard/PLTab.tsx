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
  useGetPLByPeriodsQuery,
  ProfitFilters,
} from '@/services/api/profit.api'

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

import {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { OrderItemsTable } from './OrderItemsTable'
import PLTable from './PLTable'
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

  // Fallback fuzzy search on object keys
  const matchedKey = Object.keys(MARKETPLACE_CURRENCY_MAP).find((key) =>
    primary.includes(key)
  )

  return matchedKey ? MARKETPLACE_CURRENCY_MAP[matchedKey] : fallback
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface PLTabProps {
  effectiveAccountId: string | undefined
  appliedMarketplaces: string[]
  appliedCurrency: CurrencyCode
  onMarketplacesChange: (value: string[]) => void
  onCurrencyChange: (value: CurrencyCode) => void
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const PLTab: React.FC<PLTabProps> = ({
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
  // P&L queries (Depend strictly on applied state)
  // ──────────────────────────────

  const plFilters: ProfitFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplacesState.length ? appliedMarketplacesState : ALL_MARKETPLACES,
      currency: appliedCurrencyState,
      startDate: appliedDateRange.startDate ?? undefined,
      endDate: appliedDateRange.endDate ?? undefined,
      periodicity: (appliedDateRange.periodicity as 'day' | 'week' | 'month') ?? undefined,
      preset: (appliedDateRange.presetId as
        | 'last-12-months'
        | 'last-3-months'
        | 'last-30-days'
        | 'custom') ?? undefined,
    }),
    [
      effectiveAccountId,
      appliedMarketplacesState,
      appliedCurrencyState,
      appliedDateRange,
    ],
  )

  const {
    data: plData,
    isFetching: plFetching,
    error: plError,
  } = useGetPLByPeriodsQuery(plFilters, {
    skip: !effectiveAccountId,
  })

  // ──────────────────────────────
  // Active range for product/order queries
  // ──────────────────────────────

  const activeRange = useMemo(
    () => ({
      startDate: appliedDateRange.startDate || undefined,
      endDate: appliedDateRange.endDate || undefined,
    }),
    [appliedDateRange],
  )

  // ──────────────────────────────
  // Product & Order Item queries
  // ──────────────────────────────

  const { data: productData, isFetching: productFetching } =
    useGetProfitByProductQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplacesState.length ? appliedMarketplacesState : ALL_MARKETPLACES,
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
        marketplaces: appliedMarketplacesState.length ? appliedMarketplacesState : ALL_MARKETPLACES,
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
        isFiltering={plFetching}
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
        searchWidth="w-[50%]"
        datePickerKey={datePickerKey}
      />

      {/* ── P&L Table ── */}
      <div className="mb-6">
        <PLTable
          data={plData}
          isLoading={plFetching}
          error={plError}
          currency={appliedCurrencyState}
        />
      </div>

      {/* ── Products Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-text-primary">Products</h2>

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

export default PLTab