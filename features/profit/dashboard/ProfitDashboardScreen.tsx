'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
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
  PeriodSummary,
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

type TimePeriod = 'today' | 'yesterday' | '7days' | '14days' | '30days'
type DashboardTab = 'tiles' | 'chart' | 'pnl' | 'map' | 'trends' | 'sandbox'
type TableView = 'products' | 'order-items'

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
    return { startDate: toISODate(start), endDate: toISODate(end) }
  } else if (days === 1) {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return { startDate: toISODate(start), endDate: toISODate(end) }
  } else {
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

const UI_TO_API_PERIOD: Record<TimePeriod, PeriodSummary['period']> = {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  '7days': '7DAYSAGO',
  '14days': '14DAYSAGO',
  '30days': '30DAYSAGO',
}

export const ProfitDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()
  const searchParams = useSearchParams()
  const activeTab = (searchParams?.get('tab') as DashboardTab) || 'tiles'

  const [tableView, setTableView] = useState<TableView>('products')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('yesterday')
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<TimePeriod | null>(null)

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id

  // ── SINGLE QUERY: all 5 period tiles + summary ──
  const {
    data: profitData,
    isLoading: profitLoading,
    error: profitError,
  } = useGetProfitSummaryQuery({})

  // Build lookup map from API period key to PeriodSummary
  const periodMap = useMemo(() => {
    if (!profitData?.periods) return new Map<PeriodSummary['period'], PeriodSummary>()
    return new Map(profitData.periods.map((p) => [p.period, p]))
  }, [profitData])

 const getPeriodDetailData = (periodId: TimePeriod) => {
  const apiPeriod = periodMap.get(UI_TO_API_PERIOD[periodId])
  if (!apiPeriod) return undefined
  
  const grossProfit = apiPeriod.salesRevenue + apiPeriod.totalFees - apiPeriod.totalCOGS
  
  return {
    salesRevenue: apiPeriod.salesRevenue,
    salesCount: apiPeriod.salesCount,
    ordersUnitCount: apiPeriod.ordersUnitCount,
    totalFees: apiPeriod.totalFees,
    totalRefunds: apiPeriod.totalRefunds,
    totalCOGS: apiPeriod.totalCOGS,
    totalExpenses: apiPeriod.totalExpenses,
    netProfit: apiPeriod.netProfit,
    netMargin: apiPeriod.netMargin,
    grossProfit,
    grossMargin: apiPeriod.salesRevenue > 0 ? (grossProfit / apiPeriod.salesRevenue) * 100 : 0,
    orderCount: apiPeriod.salesCount,
  }
}

  // Build period cards data for tiles view
  const periodCardsData = useMemo(() => {
    return timePeriods.map((config) => {
      const apiKey = UI_TO_API_PERIOD[config.id]
      const period = periodMap.get(apiKey)
      const range = getDateRange(config.days)

      return {
        id: config.id,
        label: config.label,
        dateRange: formatDateRange(range.startDate, range.endDate),
        salesRevenue: period?.salesRevenue ?? 0,
        salesCount: period?.salesCount ?? 0,
        ordersUnitCount: period?.ordersUnitCount ?? 0,
        totalFees: period?.totalFees ?? 0,
        totalRefunds: period?.totalRefunds ?? 0,
        totalCOGS: period?.totalCOGS ?? 0,
        totalExpenses: period?.totalExpenses ?? 0,
        netProfit: period?.netProfit ?? 0,
        netMargin: period?.netMargin ?? 0,
        isLoading: profitLoading,
      }
    })
  }, [periodMap, profitLoading])

  // Derive 30-day legacy summary for ChartSummaryTable
  const thirtyDaysPeriod = periodMap.get('30DAYSAGO')
  const thirtyDaysData = thirtyDaysPeriod
    ? {
        salesRevenue: thirtyDaysPeriod.salesRevenue,
        totalExpenses: thirtyDaysPeriod.totalExpenses,
        totalFees: thirtyDaysPeriod.totalFees,
        totalRefunds: thirtyDaysPeriod.totalRefunds,
        totalCOGS: thirtyDaysPeriod.totalCOGS,
        grossProfit: thirtyDaysPeriod.salesRevenue + thirtyDaysPeriod.totalFees - thirtyDaysPeriod.totalCOGS,
        netProfit: thirtyDaysPeriod.netProfit,
        grossMargin: 0,
        netMargin: thirtyDaysPeriod.netMargin,
        orderCount: thirtyDaysPeriod.salesCount,
        period: { startDate: null, endDate: null },
      }
    : undefined
  const thirtyDaysLoading = profitLoading

  // Date ranges for product table
  const currentRange = useMemo(() => {
    const period = timePeriods.find((p) => p.id === selectedPeriod)
    return period ? getDateRange(period.days) : getDateRange(1)
  }, [selectedPeriod])

  const { data: productData, isLoading: productLoading } = useGetProfitByProductQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...currentRange },
    { skip: !effectiveAccountId || tableView === 'order-items' }
  )

  const { data: orderItemsData, isLoading: orderItemsLoading } = useGetProfitByOrderItemsQuery(
    { ...profitFilters, accountId: effectiveAccountId, ...currentRange },
    { skip: !effectiveAccountId || tableView === 'products' }
  )

  // Chart data
  const chartDateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 12)
    return { startDate: toISODate(start), endDate: toISODate(end) }
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

  // P&L data
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

  return (
    <div className="w-full">
      <Container size="full">
        {/* ── CHART VIEW ── */}
        {activeTab === 'chart' && (
          <>
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                  <div className="flex items-center gap-3">
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
                    <div className="min-w-[140px]">
                      <Select
                        value={effectiveAccountId || ''}
                        onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                        options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                      />
                    </div>
                    <Button variant="primary" className="bg-primary-600 hover:bg-primary-700 text-white">
                      Filter
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" style={{ gridAutoRows: '1fr' }}>
              <div className="lg:col-span-2 h-full">
                <DashboardChart data={chartData} isLoading={chartLoading} error={chartError} currency="CAD" />
              </div>
              <div className="lg:col-span-1 h-full">
                <ChartSummaryTable
                  data={thirtyDaysData as any}
                  isLoading={thirtyDaysLoading}
                  currency="CAD"
                  startDate={getDateRange(30).startDate}
                  endDate={getDateRange(30).endDate}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
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
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Download">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Copy to clipboard">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productLoading} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsLoading} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── TILES VIEW ── */}
        {activeTab === 'tiles' && (
          <>
            {/* Summary banner */}
            {profitData?.summary && !profitLoading && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
                <h2 className="text-lg font-semibold mb-4">Profit Overview (Last 30 Days)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-bold">{formatCurrency(profitData.summary.totalRevenue)}</div>
                    <div className="text-blue-100 text-sm">Total Revenue</div>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${profitData.summary.totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {formatCurrency(profitData.summary.totalProfit)}
                    </div>
                    <div className="text-blue-100 text-sm">Total Net Profit</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{profitData.summary.totalOrders}</div>
                    <div className="text-blue-100 text-sm">Total Orders</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{profitData.summary.totalUnits}</div>
                    <div className="text-blue-100 text-sm">Total Units</div>
                  </div>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                  <div className="flex items-center gap-3">
                    <div className="min-w-[140px]">
                      <Select
                        value={effectiveAccountId || ''}
                        onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                        options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                      />
                    </div>
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

            {/* Period Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {periodCardsData.map((period) => {
                if (period.isLoading) {
                  return <KpiCardSkeleton key={period.id} />
                }

                const totalCosts = period.totalExpenses + period.totalFees + period.totalCOGS
                const netProfitMargin = period.netMargin

                return (
                  <Card
                    key={period.id}
                    className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md ${
                      selectedPeriod === period.id ? 'ring-2 ring-primary-200' : ''
                    }`}
                    onClick={() => setSelectedPeriod(period.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">{period.label}</h3>
                          <p className="text-xs text-text-muted">{period.dateRange}</p>
                        </div>

                        <div>
                          <div className="text-xs text-text-muted">Sales</div>
                          <div className="text-2xl font-bold text-text-primary">
                            {formatCurrency(period.salesRevenue)}
                          </div>
                          <div className={`text-xs mt-1 ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-text-muted">Orders / Units</div>
                            <div className="font-semibold text-text-primary">
                              {period.salesCount} / {period.ordersUnitCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-text-muted">Refunds</div>
                            <div className="font-semibold text-text-primary">
                              {formatNumber(period.totalRefunds)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-text-muted">Adv. cost</div>
                            <div className="font-semibold text-danger-600">
                              -{formatCurrency(period.totalExpenses)}
                            </div>
                          </div>
                          <div>
                            <div className="text-text-muted">Est. payout</div>
                            <div className="font-semibold text-text-primary">
                              {formatCurrency(period.salesRevenue - totalCosts)}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                          <div className="text-text-muted text-xs">Net profit</div>
                          <div className="flex items-center justify-between">
                            <div className={`text-xl font-bold ${period.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatCurrency(period.netProfit)}
                            </div>
                            <div className={`text-sm ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
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
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Download">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Copy to clipboard">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productLoading} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsLoading} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── P&L VIEW ── */}
        {activeTab === 'pnl' && (
          <>
            <div className="mb-6">
              <PLTable data={plData} isLoading={plLoading} error={plError} currency="CAD" />
            </div>
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                  <div className="flex items-center gap-3">
                    <div className="min-w-[140px]">
                      <Select
                        value={effectiveAccountId || ''}
                        onChange={(e) => dispatch(setFilters({ ...profitFilters, accountId: e.target.value }))}
                        options={accountsData?.map((account) => ({ value: account.id, label: account.name })) || []}
                      />
                    </div>
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
            <Card>
              <CardContent className="p-0">
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
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Download">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Copy to clipboard">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productLoading} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsLoading} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'map' && (
          <MapComponent accountId={effectiveAccountId} startDate={getDateRange(30).startDate} endDate={getDateRange(30).endDate} />
        )}

        {activeTab === 'trends' && (
          <TrendsComponent accountId={effectiveAccountId} startDate={getDateRange(30).startDate} endDate={getDateRange(30).endDate} />
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
          periodLabel={periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.label || ''}
          dateRange={periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.dateRange || ''}
          data={getPeriodDetailData(selectedPeriodForDetails)}
          currency="CAD"
        />
      )}
      </Container>
    </div>
  )
}