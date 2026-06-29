"use client"

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Tabs } from '@/design-system/tabs'
import { KpiCardSkeleton } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useDebounce } from '@/utils/debounce'
import {
  useGetRepricerSummaryQuery,
  useGetRepricerProductsQuery,
  useGetRepricerChartQuery,
  useGetRepricerRulesQuery,
  useTriggerManualRepricingMutation,
  RepricerFilters,
  RepricingStatus,
  BuyBoxStatus,
} from '@/services/api/repricer.api'
import { RepricerProductsTable } from './RepricerProductsTable'
import { RepricerChart } from './RepricerChart'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'

/**
 * Time period type for different views
 */
type TimePeriod = 'today' | 'yesterday' | '7days' | '14days' | '30days'

/**
 * Top navigation tab type
 */
type DashboardTab = 'overview' | 'products' | 'rules' | 'analytics'

/**
 * Chart type
 */
type ChartType = 'price' | 'buybox' | 'revenue' | 'margin'

/**
 * Time period configuration
 */
const timePeriods: Record<TimePeriod, { label: string; days: number }> = {
  today: { label: 'Today', days: 1 },
  yesterday: { label: 'Yesterday', days: 1 },
  '7days': { label: 'Last 7 Days', days: 7 },
  '14days': { label: 'Last 14 Days', days: 14 },
  '30days': { label: 'Last 30 Days', days: 30 },
}

/**
 * Repricer Dashboard Screen Component
 *
 * Main dashboard for the Repricer feature with KPI tiles, charts, and product tables
 */
export const RepricerDashboardScreen = () => {
  // State
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days')
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [chartType, setChartType] = useState<ChartType>('price')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RepricingStatus | 'all'>('all')
  const [buyBoxFilter, setBuyBoxFilter] = useState<BuyBoxStatus | 'all'>('all')

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 300)

  // API Queries
  const { data: accounts } = useGetAccountsQuery()
  const [triggerRepricing, { isLoading: isRepricingLoading }] =
    useTriggerManualRepricingMutation()

  // Build filters
  const filters: RepricerFilters = useMemo(() => {
    const now = new Date()
    const startDate = new Date(now)

    if (timePeriod === 'today') {
      startDate.setHours(0, 0, 0, 0)
    } else if (timePeriod === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
    } else {
      startDate.setDate(startDate.getDate() - timePeriods[timePeriod].days)
    }

    return {
      accountId: selectedAccount || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      buyBoxStatus: buyBoxFilter !== 'all' ? buyBoxFilter : undefined,
      search: debouncedSearch || undefined,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    }
  }, [selectedAccount, timePeriod, statusFilter, buyBoxFilter, debouncedSearch])

  const { data: summary, isLoading: summaryLoading } = useGetRepricerSummaryQuery(filters)
  const { data: products, isLoading: productsLoading } = useGetRepricerProductsQuery(filters)
  const { data: chartData, isLoading: chartLoading } = useGetRepricerChartQuery(filters)
  const { data: rules, isLoading: rulesLoading } = useGetRepricerRulesQuery({
    accountId: selectedAccount || undefined,
  })

  // Handle manual repricing
  const handleManualRepricing = async () => {
    try {
      await triggerRepricing({}).unwrap()
      // Show success message (you can add a toast notification here)
    } catch (error) {
      console.error('Failed to trigger repricing:', error)
      // Show error message
    }
  }

  // KPI Card Component
  const KpiCard = ({
    title,
    value,
    change,
    variant = 'default',
    loading = false,
  }: {
    title: string
    value: string | number
    change?: number
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
    loading?: boolean
  }) => {
    if (loading) {
      return <KpiCardSkeleton />
    }

    return (
      <Card>
        <CardContent className="p-6">
          <div>
            <p className="text-sm text-text-muted mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <>
                    <svg
                      className="w-4 h-4 text-text-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    <span className="text-sm text-text-success">
                      +{formatPercentage(Math.abs(change))}
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 text-text-danger"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 17l-5-5m0 0l5-5m-5 5h12"
                      />
                    </svg>
                    <span className="text-sm text-text-danger">
                      -{formatPercentage(Math.abs(change))}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Tabs configuration
  const tabItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products' },
    { id: 'rules', label: 'Rules' },
    { id: 'analytics', label: 'Analytics' },
  ]

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Repricer Dashboard
            </h1>
            <p className="text-text-muted">
              Monitor pricing, competitors, and Buy Box performance
            </p>
          </div>
          <Button onClick={handleManualRepricing} disabled={isRepricingLoading}>
            <div className="flex items-center gap-2">
              <svg
                className={`w-4 h-4 ${isRepricingLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isRepricingLoading ? 'Repricing...' : 'Reprice Now'}
            </div>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-row items-end gap-4 flex-wrap">
          <div className="flex-shrink-0">
            <Select
              label="Account"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-[200px]"
              options={[
                { value: '', label: 'All Accounts' },
                ...(accounts?.map((account) => ({
                  value: account.id,
                  label: account.name,
                })) || []),
              ]}
            />
          </div>

          <div className="flex-shrink-0">
            <Select
              label="Time Period"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="w-[150px]"
              options={Object.entries(timePeriods).map(([key, { label }]) => ({
                value: key,
                label: label,
              }))}
            />
          </div>

          <div className="flex-shrink-0">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RepricingStatus | 'all')}
              className="w-[150px]"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'error', label: 'Error' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
          </div>

          <div className="flex-shrink-0">
            <Select
              label="Buy Box"
              value={buyBoxFilter}
              onChange={(e) => setBuyBoxFilter(e.target.value as BuyBoxStatus | 'all')}
              className="w-[150px]"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'won', label: 'Won' },
                { value: 'lost', label: 'Lost' },
                { value: 'ineligible', label: 'Ineligible' },
              ]}
            />
          </div>

          <div className="flex-shrink-0">
            <Input
              label="Search"
              placeholder="Search by title, SKU, or ASIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[300px]"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        items={tabItems}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as DashboardTab)}
        className="mb-8"
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total Products"
              value={formatNumber(summary?.totalProducts || 0)}
              loading={summaryLoading}
            />
            <KpiCard
              title="Buy Box Win Rate"
              value={formatPercentage(summary?.buyBoxWinRate || 0)}
              change={summary?.revenueChange}
              variant="success"
              loading={summaryLoading}
            />
            <KpiCard
              title="Average Price"
              value={formatCurrency(summary?.averagePrice || 0)}
              variant="info"
              loading={summaryLoading}
            />
            <KpiCard
              title="Competitors Tracked"
              value={formatNumber(summary?.competitorTracked || 0)}
              loading={summaryLoading}
            />
          </div>

          {/* Secondary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Active Products"
              value={formatNumber(summary?.activeProducts || 0)}
              loading={summaryLoading}
            />
            <KpiCard
              title="Average Margin"
              value={formatPercentage(summary?.averageMargin || 0)}
              variant="warning"
              loading={summaryLoading}
            />
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(summary?.totalRevenue || 0)}
              change={summary?.revenueChange}
              loading={summaryLoading}
            />
            <KpiCard
              title="Price Changes (24h)"
              value={formatNumber(summary?.priceChanges24h || 0)}
              loading={summaryLoading}
            />
          </div>

          {/* Chart */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={chartType === 'price' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartType('price')}
              >
                Price
              </Button>
              <Button
                variant={chartType === 'buybox' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartType('buybox')}
              >
                Buy Box
              </Button>
              <Button
                variant={chartType === 'revenue' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartType('revenue')}
              >
                Revenue
              </Button>
              <Button
                variant={chartType === 'margin' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartType('margin')}
              >
                Margin
              </Button>
            </div>
            <RepricerChart data={chartData} isLoading={chartLoading} chartType={chartType} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-success-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="text-text-muted">Active</span>
                  </div>
                  <span className="font-semibold">{summary?.activeProducts || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-warning-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    <span className="text-text-muted">Paused</span>
                  </div>
                  <span className="font-semibold">{summary?.pausedProducts || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="text-text-muted">Total</span>
                  </div>
                  <span className="font-semibold">{summary?.totalProducts || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-primary mb-2">
                  {rules?.filter((r) => r.isActive).length || 0}
                </div>
                <p className="text-sm text-text-muted">
                  {rules?.length || 0} total rules configured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Win Rate</span>
                  <Badge variant="success">
                    {formatPercentage(summary?.buyBoxWinRate || 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Avg Margin</span>
                  <Badge variant="warning">
                    {formatPercentage(summary?.averageMargin || 0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <RepricerProductsTable
            products={products}
            isLoading={productsLoading}
            searchTerm={debouncedSearch}
          />
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Repricing Rules</CardTitle>
                <Button>Create Rule</Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8 text-text-muted">Loading rules...</div>
              ) : rules && rules.length > 0 ? (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border border-border-primary rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-text-primary">{rule.name}</h4>
                          <p className="text-sm text-text-muted">
                            Strategy: {rule.strategy.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <Badge variant={rule.isActive ? 'success' : 'secondary'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-text-muted">
                        Applied to {rule.productsApplied} products
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  No rules configured. Create your first rule to start repricing.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RepricerChart data={chartData} isLoading={chartLoading} chartType="price" />
            <RepricerChart data={chartData} isLoading={chartLoading} chartType="buybox" />
            <RepricerChart data={chartData} isLoading={chartLoading} chartType="revenue" />
            <RepricerChart data={chartData} isLoading={chartLoading} chartType="margin" />
          </div>
        </div>
      )}
    </Container>
  )
}
