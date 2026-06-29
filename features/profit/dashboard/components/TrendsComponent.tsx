'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { useGetProductTrendsQuery, ProfitFilters } from '@/services/api/profit.api'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { ErrorComponent } from './ErrorComponent'
import { TrendsTable } from './TrendsTable'
import { MetricTabs, TrendMetric } from './MetricTabs'
import { cn } from '@/utils/cn'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { setFilters } from '@/store/profit.slice'

/**
 * TrendsComponent
 * 
 * Main component for displaying product-level trends in a table format
 * 
 * Features:
 * - Fetches product-level trends data from API
 * - Displays product table with embedded charts
 * - Supports metric switching (Sales, Units, Orders, etc.)
 * - Supports heatmap visualization
 * - Supports date range and period filtering
 * - Handles loading and error states
 * - Fully responsive and mobile-friendly
 * 
 * Architecture Note: This component is modular and can be extracted
 * to a separate microservice frontend.
 */

export interface TrendsComponentProps {
  startDate?: string
  endDate?: string
  accountId?: string
  marketplaceId?: string
  className?: string
}

/**
 * Get default date range (last 30 days)
 */
const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

export const TrendsComponent: React.FC<TrendsComponentProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  accountId: initialAccountId,
  marketplaceId,
  className,
}) => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()

  const effectiveAccountId = initialAccountId || profitFilters.accountId || accountsData?.[0]?.id

  // State for filters
  const defaultRange = getDefaultDateRange()
  const [startDate, setStartDate] = useState(initialStartDate || defaultRange.startDate)
  const [endDate, setEndDate] = useState(initialEndDate || defaultRange.endDate)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'stock'>('sales')
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days')
  const [selectedCurrency, setSelectedCurrency] = useState('CAD')
  const [metric, setMetric] = useState<TrendMetric>('sales')
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)

  // Update filters when props change
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate)
    if (initialEndDate) setEndDate(initialEndDate)
  }, [initialStartDate, initialEndDate])

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  // Update date range based on period selection
  useEffect(() => {
    const end = new Date()
    const start = new Date()

    switch (selectedPeriod) {
      case 'last-7-days':
        start.setDate(start.getDate() - 7)
        break
      case 'last-30-days':
        start.setDate(start.getDate() - 30)
        break
      case 'last-90-days':
        start.setDate(start.getDate() - 90)
        break
      default:
        start.setDate(start.getDate() - 30)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [selectedPeriod])

  // Build filters for API query
  const filters: ProfitFilters & { metric?: string } = {
    startDate,
    endDate,
    accountId: effectiveAccountId,
    marketplaceId,
    metric,
  }

  // Fetch product trends data
  const {
    data: trendsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProductTrendsQuery(filters, {
    skip: !startDate || !endDate || !effectiveAccountId,
  })

  return (
    <div className={cn('w-full', className)}>
      {/* Filters Toolbar */}
      <div className="bg-surface-secondary border-b border-border mb-6">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
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

            {/* Sales/Stock Radio Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedMetric === 'sales' ? 'primary' : 'secondary'}
                onClick={() => setSelectedMetric('sales')}
                size="sm"
                className={selectedMetric === 'sales' ? 'bg-primary-600 hover:bg-primary-700 text-white' : ''}
              >
                Sales
              </Button>
              <Button
                variant={selectedMetric === 'stock' ? 'primary' : 'secondary'}
                onClick={() => setSelectedMetric('stock')}
                size="sm"
                className={selectedMetric === 'stock' ? 'bg-primary-600 hover:bg-primary-700 text-white' : ''}
              >
                Stock
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Period Dropdown */}
              <div className="min-w-[140px]">
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  options={[
                    { value: 'last-7-days', label: 'Last 7 days, by day' },
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
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
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

      {/* Metric Tabs */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <MetricTabs value={metric} onChange={setMetric} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Heatmap</span>
            <button
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                heatmapEnabled ? 'bg-primary-600' : 'bg-surface-tertiary'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  heatmapEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className={cn('text-sm', heatmapEnabled ? 'text-primary-600' : 'text-text-muted')}>
              {heatmapEnabled ? 'on' : 'off'}
            </span>
          </div>
        </div>
      </div>

      {/* Trends Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-text-secondary">Loading trends data...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorComponent
                error={error}
                onRetry={() => refetch()}
                title="Failed to load trends data"
              />
            </div>
          ) : (
            <div className="p-6">
              <TrendsTable
                data={trendsData}
                isLoading={isLoading}
                error={isError ? error : undefined}
                currency={selectedCurrency}
                searchTerm={searchTerm}
                heatmapEnabled={heatmapEnabled}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
