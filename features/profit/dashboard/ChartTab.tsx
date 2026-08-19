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
  ProfitFilters,
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

import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'
import { ChartSummaryTable } from './components'
import ProfitDashboardHeader from './components/ProfitDashboardHeader'
import { DashboardChart } from './DashboardChart'
import { OrderItemsTable } from './OrderItemsTable'
import { SellerboardProductsTable } from './SellerboardProductsTable'


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
  // Chart filters
  // ──────────────────────────────

  const chartFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      period: (dateRange.periodicity || 'day') as ChartPeriod,
      currency: appliedCurrency,
    }),
    [effectiveAccountId, appliedMarketplaces, dateRange, appliedCurrency],
  )

  const {
    data: chartData,
    isFetching: chartFetching,
    error: chartError,
    refetch: refetchChart,
  } = useGetDashboardChartQuery(chartFilters as any, {
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
  // Reload
  // ──────────────────────────────

  const handleReload = useCallback(() => {
    refetchChart()
    handleApply()
  }, [refetchChart, handleApply])

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
        marketplaces={appliedMarketplaces}
        onMarketplacesChange={handleMarketplacesChange}
        currency={appliedCurrency}
        onCurrencyChange={handleCurrencyChange}
        currencyOptions={[
          { value: 'CAD', label: 'CAD' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ]}
        onFilter={handleReload}
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
            currency={appliedCurrency}
          />
        </div>

        <div className="lg:col-span-1 h-full">
          <ChartSummaryTable
            data={chartData?.summary}
            isLoading={chartFetching}
            currency={appliedCurrency}
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
              <h2 className="text-lg font-semibold text-text-primary">All Periods</h2>

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