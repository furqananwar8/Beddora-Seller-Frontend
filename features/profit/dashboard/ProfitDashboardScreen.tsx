'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Tabs } from '@/design-system/tabs'
import { KpiCardSkeleton } from '@/design-system/loaders'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useDebounce } from '@/utils/debounce'
import {
  useGetProfitSummaryQuery,
  useGetProfitByProductQuery,
  useGetProfitByOrderItemsQuery,
  useGetPLByPeriodsQuery,
  ProfitFilters,
} from '@/services/api/profit.api'
import { useGetDashboardChartQuery, ChartFilters } from '@/services/api/charts.api'
import { SellerboardProductsTable } from './SellerboardProductsTable'
import { OrderItemsTable } from './OrderItemsTable'
import { DashboardChart } from './DashboardChart'
import { PLTable } from './PLTable'
import { MapComponent } from './components/MapComponent'
import { TrendsComponent } from './components/TrendsComponent'
import { ChartSummaryTable } from './components/ChartSummaryTable'
import { SandboxOrdersTest } from './components'
import { TileDetailsModal } from './components/TileDetailsModal'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'

/**
 * Time period type for different views
 */
type TimePeriod = 'today' | 'yesterday' | '7days' | '14days' | '30days'

/**
 * Top navigation tab type
 */
type DashboardTab = 'tiles' | 'chart' | 'pnl' | 'map' | 'trends' | 'sandbox'

/**
 * Product/Order items view type
 */
type TableView = 'products' | 'order-items'

/**
 * Time period configuration
 */
const timePeriods: Array<{ id: TimePeriod; label: string; days: number }> = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: '7days', label: '7 days', days: 7 },
  { id: '14days', label: '14 days', days: 14 },
  { id: '30days', label: '30 days', days: 30 },
]

const toISODate = (date: Date) => date.toISOString().split('T')[0]

const getDateRange = (days: number) => {
  const end = new Date()
  const start = new Date()
  
  if (days === 0) {
    // Today
    return { startDate: toISODate(start), endDate: toISODate(end) }
  } else if (days === 1) {
    // Yesterday
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return { startDate: toISODate(start), endDate: toISODate(end) }
  } else {
    // Last N days
    start.setDate(start.getDate() - (days - 1))
    return { startDate: toISODate(start), endDate: toISODate(end) }
  }
}

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (startDate === endDate) {
    return start.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  return `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

/**
 * ProfitDashboardScreen Component
 * 
 * Sellerboard-style dashboard with time period cards and comprehensive product table
 */
export const ProfitDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()
  const searchParams = useSearchParams()
  
  // Get active tab from URL or default to 'tiles'
  const activeTab = (searchParams?.get('tab') as DashboardTab) || 'tiles'
  
  const [tableView, setTableView] = useState<TableView>('products')
  const [searchTerm, setSearchTerm] = useState('')
  // Debounce search term to avoid excessive filtering/API calls (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('yesterday')
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<TimePeriod | null>(null)
  // Track which periods have been requested (for lazy loading)
  const [requestedPeriods, setRequestedPeriods] = useState<Set<TimePeriod>>(new Set(['yesterday']))

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  // Request periods when tabs that need them become active
  useEffect(() => {
    if (activeTab === 'chart') {
      // Chart tab uses 30days data for summary table
      setRequestedPeriods((prev) => new Set([...prev, '30days']))
    }
  }, [activeTab])

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id

  // Date ranges for each period (computed once)
  const todayRange = getDateRange(0)
  const yesterdayRange = getDateRange(1)
  const sevenDaysRange = getDateRange(7)
  const fourteenDaysRange = getDateRange(14)
  const thirtyDaysRange = getDateRange(30)

  // Helper to mark a period as requested when user interacts with it
  const requestPeriod = (period: TimePeriod) => {
    setRequestedPeriods((prev) => new Set([...prev, period]))
  }

  // Only fetch periods that have been requested (lazy loading)
  const { data: todayData, isLoading: todayLoading } = useGetProfitSummaryQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...todayRange },
    { skip: !effectiveAccountId || !requestedPeriods.has('today') }
  )

  const { data: yesterdayData, isLoading: yesterdayLoading } = useGetProfitSummaryQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...yesterdayRange },
    { skip: !effectiveAccountId || !requestedPeriods.has('yesterday') }
  )

  const { data: sevenDaysData, isLoading: sevenDaysLoading } = useGetProfitSummaryQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...sevenDaysRange },
    { skip: !effectiveAccountId || !requestedPeriods.has('7days') }
  )

  const { data: fourteenDaysData, isLoading: fourteenDaysLoading } = useGetProfitSummaryQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...fourteenDaysRange },
    { skip: !effectiveAccountId || !requestedPeriods.has('14days') }
  )

  const { data: thirtyDaysData, isLoading: thirtyDaysLoading } = useGetProfitSummaryQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...thirtyDaysRange },
    { skip: !effectiveAccountId || !requestedPeriods.has('30days') }
  )

  // Get products for selected period
  const currentRange = useMemo(() => {
    const period = timePeriods.find((p) => p.id === selectedPeriod)
    return period ? getDateRange(period.days) : yesterdayRange
  }, [selectedPeriod])

  const { data: productData, isLoading: productLoading } = useGetProfitByProductQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...currentRange },
    { skip: !effectiveAccountId || tableView === 'order-items' }
  )

  const { data: orderItemsData, isLoading: orderItemsLoading } = useGetProfitByOrderItemsQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...currentRange },
    { skip: !effectiveAccountId || tableView === 'products' }
  )

  useEffect(() => {
  console.log('📊 Profit query state:', {
    skip: !effectiveAccountId,
    effectiveAccountId,
    productLoading,
    hasData: !!productData,
  })
}, [effectiveAccountId, productLoading, productData])

  // Get chart data for "Last 12 months, by month"
  const chartDateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 12)
    return {
      startDate: toISODate(start),
      endDate: toISODate(end),
    }
  }, [])

  const chartFilters: ChartFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaceId: profitFilters.marketplaceId,
      ...chartDateRange,
      period: 'month',
    }),
    [effectiveAccountId, profitFilters.marketplaceId, chartDateRange]
  )

  const { data: chartData, isLoading: chartLoading, error: chartError } = useGetDashboardChartQuery(
    chartFilters,
    { skip: !effectiveAccountId || activeTab !== 'chart' }
  )

  // Get P&L data
  const plFilters: ProfitFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaceId: profitFilters.marketplaceId,
    }),
    [effectiveAccountId, profitFilters.marketplaceId]
  )

  const { data: plData, isLoading: plLoading, error: plError } = useGetPLByPeriodsQuery(
    plFilters,
    { skip: !effectiveAccountId || activeTab !== 'pnl' }
  )

  const periodCardsData = [
    {
      id: 'today' as TimePeriod,
      label: 'Today',
      dateRange: formatDateRange(todayRange.startDate, todayRange.endDate),
      data: todayData,
      isLoading: todayLoading,
    },
    {
      id: 'yesterday' as TimePeriod,
      label: 'Yesterday',
      dateRange: formatDateRange(yesterdayRange.startDate, yesterdayRange.endDate),
      data: yesterdayData,
      isLoading: yesterdayLoading,
    },
    {
      id: '7days' as TimePeriod,
      label: '7 days',
      dateRange: formatDateRange(sevenDaysRange.startDate, sevenDaysRange.endDate),
      data: sevenDaysData,
      isLoading: sevenDaysLoading,
    },
    {
      id: '14days' as TimePeriod,
      label: '14 days',
      dateRange: formatDateRange(fourteenDaysRange.startDate, fourteenDaysRange.endDate),
      data: fourteenDaysData,
      isLoading: fourteenDaysLoading,
    },
    {
      id: '30days' as TimePeriod,
      label: '30 days',
      dateRange: formatDateRange(thirtyDaysRange.startDate, thirtyDaysRange.endDate),
      data: thirtyDaysData,
      isLoading: thirtyDaysLoading,
    },
  ]

  return (
    <div className="w-full">
      <Container size="full">

      {/* Chart View */}
      {activeTab === 'chart' && (
        <>
          {/* Search and Filters Toolbar for Chart View */}
          <div className="bg-surface-secondary border-b border-border mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <Input
                      type="text"
                      placeholder="Q Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                  {/* Period Dropdown */}
                  <div className="min-w-[180px]">
                    <Select
                      value="last-12-months"
                      onChange={() => undefined}
                      options={[
                        { value: 'last-12-months', label: 'Last 12 months, by month' },
                        { value: 'last-30-days', label: 'Last 30 days, by day' },
                        { value: 'last-90-days', label: 'Last 90 days, by day' },
                      ]}
                    />
                  </div>

                  {/* Marketplace Dropdown */}
                  <div className="min-w-[140px]">
                    <Select
                      value={effectiveAccountId || ''}
                      onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                      options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                    />
                  </div>

                  {/* Currency Dropdown */}
                  <div className="min-w-[100px]">
                    <Select
                      value="CAD"
                      onChange={() => undefined}
                      options={[
                        { value: 'CAD', label: 'CAD' },
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                      ]}
                    />
                  </div>

                  {/* Filter Button */}
                  <Button variant="primary" className="bg-primary-600 hover:bg-primary-700 text-white">
                    Filter
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart and Summary Table - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" style={{ gridAutoRows: '1fr' }}>
            {/* Chart Section - Takes 2/3 of the width */}
            <div className="lg:col-span-2 h-full">
              <DashboardChart
                data={chartData}
                isLoading={chartLoading}
                error={chartError}
                currency="CAD"
              />
            </div>

            {/* Summary Table Section - Takes 1/3 of the width */}
            <div className="lg:col-span-1 h-full">
              <ChartSummaryTable
                data={thirtyDaysData}
                isLoading={thirtyDaysLoading}
                currency="CAD"
                startDate={thirtyDaysRange.startDate}
                endDate={thirtyDaysRange.endDate}
              />
            </div>
          </div>

          {/* Table Section for Chart View */}
          <Card>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-text-primary">All Periods</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTableView('products')}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                        tableView === 'products'
                          ? 'bg-primary-600 text-white'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Products
                    </button>
                    <button
                      onClick={() => setTableView('order-items')}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                        tableView === 'order-items'
                          ? 'bg-primary-600 text-white'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Order items
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value="group-by-product"
                    onChange={() => undefined}
                    options={[
                      { value: 'group-by-parent', label: 'Group by parent' },
                      { value: 'group-by-product', label: 'Group by product' },
                      { value: 'group-by-category', label: 'Group by category' },
                    ]}
                    className="min-w-[160px]"
                  />
                  <button
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Products or Order Items Table */}
              <div className="p-6">
                {tableView === 'products' ? (
                  <SellerboardProductsTable
                    products={productData}
                    isLoading={productLoading}
                    searchTerm={debouncedSearchTerm}
                  />
                ) : (
                  <OrderItemsTable
                    orderItems={orderItemsData}
                    isLoading={orderItemsLoading}
                    searchTerm={debouncedSearchTerm}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tiles View (Time Period Cards) */}
      {activeTab === 'tiles' && (
        <>
      {/* Search and Filters Toolbar */}
      <div className="bg-surface-secondary border-b border-border mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Marketplace Dropdown (Amazon US) */}
              <div className="min-w-[140px]">
                <Select
                  value={effectiveAccountId || ''}
                  onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                  options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                />
              </div>

              {/* Global Period Filter (Last 30 Days) */}
              <div className="min-w-[140px]">
                <Select
                  value="last-30-days"
                  onChange={() => undefined}
                  options={[
                    { value: 'last-7-days', label: 'Last 7 Days' },
                    { value: 'last-30-days', label: 'Last 30 Days' },
                    { value: 'last-90-days', label: 'Last 90 Days' },
                  ]}
                />
              </div>

              {/* Period Dropdown (for KPI cards) */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="min-w-[140px]">
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => {
                      const newPeriod = e.target.value as TimePeriod
                      requestPeriod(newPeriod) // Request data when period changes
                      setSelectedPeriod(newPeriod)
                    }}
                    options={timePeriods.map((p) => ({ value: p.id, label: p.label }))}
                  />
                </div>
              </div>

              {/* Currency Dropdown */}
              <div className="min-w-[100px]">
                <Select
                  value="CAD"
                  onChange={() => undefined}
                  options={[
                    { value: 'CAD', label: 'CAD' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                  ]}
                />
              </div>

              {/* Filter Button */}
              <Button variant="ghost" className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Time Period Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {periodCardsData.map((period) => {
          if (period.isLoading) {
            return <KpiCardSkeleton key={period.id} />
          }

          const data = period.data
          const totalCosts = (data?.totalExpenses || 0) + (data?.totalFees || 0) + (data?.totalCOGS || 0)
          const netProfitMargin = data?.netMargin || 0

          return (
            <Card
              key={period.id}
              className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md ${
                selectedPeriod === period.id ? 'ring-2 ring-primary-200' : ''
              }`}
              onClick={() => {
                requestPeriod(period.id) // Request data when user clicks
                setSelectedPeriod(period.id)
              }}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{period.label}</h3>
                    <p className="text-xs text-text-muted">{period.dateRange}</p>
                  </div>

                  {/* Sales */}
                  <div>
                    <div className="text-xs text-text-muted">Sales</div>
                    <div className="text-2xl font-bold text-text-primary">{formatCurrency(data?.salesRevenue || 0)}</div>
                    <div className={`text-xs mt-1 ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                    </div>
                  </div>

                  {/* Orders and Refunds */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-text-muted">Orders / Units</div>
                      <div className="font-semibold text-text-primary">{data?.orderCount || 0} / {data?.orderCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Refunds</div>
                      <div className="font-semibold text-text-primary">{formatNumber(data?.totalRefunds || 0)}</div>
                    </div>
                  </div>

                  {/* Costs and Payout */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-text-muted">Adv. cost</div>
                      <div className="font-semibold text-danger-600">-{formatCurrency(data?.totalExpenses || 0)}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Est. payout</div>
                      <div className="font-semibold text-text-primary">
                        {formatCurrency((data?.salesRevenue || 0) - totalCosts)}
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="pt-3 border-t border-border">
                    <div className="text-text-muted text-xs">Net profit</div>
                    <div className="flex items-center justify-between">
                      <div className={`text-xl font-bold ${(data?.netProfit || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {formatCurrency(data?.netProfit || 0)}
                      </div>
                      <div className={`text-sm ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                      </div>
                    </div>
                  </div>

                  {/* More link */}
                  <div className="text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        requestPeriod(period.id) // Request data when user clicks "More"
                        setSelectedPeriodForDetails(period.id)
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      More
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Table Section */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-text-primary capitalize">
                {selectedPeriod === 'today'
                  ? 'Today'
                  : selectedPeriod === 'yesterday'
                  ? 'Yesterday'
                  : selectedPeriod === '7days'
                  ? '7 days'
                  : selectedPeriod === '14days'
                  ? '14 days'
                  : '30 days'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setTableView('products')}
                  className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                    tableView === 'products'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Products
                </button>
                <button
                  onClick={() => setTableView('order-items')}
                  className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                    tableView === 'order-items'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Order items
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                <option>Group by parent</option>
                <option>Group by product</option>
                <option>Group by category</option>
              </select>
              <button
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                title="Download"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                title="Copy to clipboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Products or Order Items Table */}
          <div className="p-6">
            {tableView === 'products' ? (
              <SellerboardProductsTable
                products={productData}
                isLoading={productLoading}
                searchTerm={debouncedSearchTerm}
              />
            ) : (
              <OrderItemsTable
                orderItems={orderItemsData}
                isLoading={orderItemsLoading}
                searchTerm={debouncedSearchTerm}
              />
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {/* P&L View */}
      {activeTab === 'pnl' && (
        <>
          {/* P&L Table */}
          <div className="mb-6">
            <PLTable
              data={plData}
              isLoading={plLoading}
              error={plError}
              currency="CAD"
            />
          </div>

          {/* Search and Filters Toolbar for P&L View */}
          <div className="bg-surface-secondary border-b border-border mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                  {/* Marketplace Dropdown */}
                  <div className="min-w-[140px]">
                    <Select
                      value={effectiveAccountId || ''}
                      onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                      options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                    />
                  </div>

                  {/* Period Dropdown */}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-[140px]">
                      <Select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
                        options={timePeriods.map((p) => ({ value: p.id, label: p.label }))}
                      />
                    </div>
                  </div>

                  {/* Currency Dropdown */}
                  <div className="min-w-[100px]">
                    <Select
                      value="CAD"
                      onChange={() => undefined}
                      options={[
                        { value: 'CAD', label: 'CAD' },
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section for P&L View */}
          <Card>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-text-primary capitalize">
                    {selectedPeriod === 'today'
                      ? 'Today'
                      : selectedPeriod === 'yesterday'
                      ? 'Yesterday'
                      : selectedPeriod === '7days'
                      ? '7 days'
                      : selectedPeriod === '14days'
                      ? '14 days'
                      : '30 days'}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTableView('products')}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                        tableView === 'products'
                          ? 'bg-primary-600 text-white'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Products
                    </button>
                    <button
                      onClick={() => setTableView('order-items')}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                        tableView === 'order-items'
                          ? 'bg-primary-600 text-white'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Order items
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                    <option>Group by parent</option>
                    <option>Group by product</option>
                    <option>Group by category</option>
                  </select>
                  <button
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Products or Order Items Table */}
              <div className="p-6">
                {tableView === 'products' ? (
                  <SellerboardProductsTable
                    products={productData}
                    isLoading={productLoading}
                    searchTerm={debouncedSearchTerm}
                  />
                ) : (
                  <OrderItemsTable
                    orderItems={orderItemsData}
                    isLoading={orderItemsLoading}
                    searchTerm={debouncedSearchTerm}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'map' && (
        <MapComponent
          accountId={effectiveAccountId}
          startDate={thirtyDaysRange.startDate}
          endDate={thirtyDaysRange.endDate}
        />
      )}

      {activeTab === 'trends' && (
        <TrendsComponent
          accountId={effectiveAccountId}
          startDate={thirtyDaysRange.startDate}
          endDate={thirtyDaysRange.endDate}
        />
      )}

      {activeTab === 'sandbox' && (
        <div className="space-y-6">
          <SandboxOrdersTest />
        </div>
      )}

      {/* Tile Details Modal */}
      {selectedPeriodForDetails && (
        <TileDetailsModal
          isOpen={!!selectedPeriodForDetails}
          onClose={() => setSelectedPeriodForDetails(null)}
          periodLabel={periodCardsData.find(p => p.id === selectedPeriodForDetails)?.label || ''}
          dateRange={periodCardsData.find(p => p.id === selectedPeriodForDetails)?.dateRange || ''}
          data={periodCardsData.find(p => p.id === selectedPeriodForDetails)?.data}
          currency="CAD"
        />
      )}

      </Container>
    </div>
  )
}
