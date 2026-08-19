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

import { MARKETPLACES } from '@/utils/marketplaces'

import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { OrderItemsTable } from './OrderItemsTable'
import PLTable from './PLTable'
import { SellerboardProductsTable } from './SellerboardProductsTable'


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
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [tableView, setTableView] = useState<TableView>('products')

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
  // Date range change
  // ──────────────────────────────

  const handleDateRangeChange = useCallback(
    (range: DateRangeValue) => {
      const preset = chartPresets.find((item) => item.id === range.presetId)

      const periodicity =
        preset?.getRange().periodicity ||
        inferPeriodicity(range.startDate as string, range.endDate as string)

      setDateRange({ ...range, periodicity })
    },
    [],
  )

  // ──────────────────────────────
  // Apply / reload
  // ──────────────────────────────

  const handleApply = useCallback(() => {
    setDatePickerKey((k) => k + 1)
  }, [])

  // ──────────────────────────────
  // Marketplace change (also syncs parent)
  // ──────────────────────────────

  const handleMarketplacesChange = useCallback(
    (value: string[]) => {
      const marketplaces =
        value.length > 0
          ? [...value]
          : MARKETPLACES.map((m) => m.id)

      onMarketplacesChange(marketplaces)
      dispatch(setFilters({ ...profitFilters, marketplaces }))
    },
    [dispatch, profitFilters, onMarketplacesChange],
  )

  // ──────────────────────────────
  // Currency change (also syncs parent)
  // ──────────────────────────────

  const handleCurrencyChange = useCallback(
    (value: string) => {
      const currency = value as CurrencyCode
      onCurrencyChange(currency)
      dispatch(setFilters({ ...profitFilters, currency }))
    },
    [dispatch, profitFilters, onCurrencyChange],
  )

  // ──────────────────────────────
  // P&L filters
  // ──────────────────────────────

  const plFilters: ProfitFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
      currency: appliedCurrency,
      startDate: dateRange.startDate ?? undefined,
      endDate: dateRange.endDate ?? undefined,
      periodicity: (dateRange.periodicity as 'day' | 'week' | 'month') ?? undefined,
      preset: (dateRange.presetId as
        | 'last-12-months'
        | 'last-3-months'
        | 'last-30-days'
        | 'custom') ?? undefined,
    }),
    [effectiveAccountId, appliedMarketplaces, appliedCurrency, dateRange],
  )

  const {
    data: plData,
    isFetching: plFetching,
    error: plError,
  } = useGetPLByPeriodsQuery(plFilters, {
    skip: !effectiveAccountId,
  })

  // ──────────────────────────────
  // Active range for product table
  // ──────────────────────────────

  const activeRange = useMemo(
    () => ({
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    }),
    [dateRange],
  )

  // ──────────────────────────────
  // Product query
  // ──────────────────────────────

  const { data: productData, isFetching: productFetching } =
    useGetProfitByProductQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
        currency: appliedCurrency,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      },
      {
        skip: !effectiveAccountId || tableView === 'order-items',
      },
    )

  // ──────────────────────────────
  // Order items query
  // ──────────────────────────────

  const { data: orderItemsData, isFetching: orderItemsFetching } =
    useGetProfitByOrderItemsQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
        currency: appliedCurrency,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      },
      {
        skip: !effectiveAccountId || tableView === 'products',
      },
    )

  // ──────────────────────────────
  // Date range value for header picker
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
        searchWidth="w-[50%]"
        datePickerKey={datePickerKey}
      />

      {/* ── P&L Table ── */}
      <div className="mb-6">
        <PLTable
          data={plData}
          isLoading={plFetching}
          error={plError}
          currency={appliedCurrency}
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