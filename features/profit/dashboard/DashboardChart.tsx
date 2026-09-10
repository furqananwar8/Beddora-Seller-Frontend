'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { DashboardChartResponse } from '@/services/api/charts.api'
import { formatCurrency, formatNumber } from '@/utils/format'

const CombinationChart = dynamic(
  () =>
    import('@/design-system/charts/CombinationChart').then(
      (mod) => mod.CombinationChart
    ),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
)

export interface DashboardChartProps {
  data?: DashboardChartResponse
  isLoading?: boolean
  error?: any
  currency?: string
}

const ChartSkeleton: React.FC = () => (
  <div className="animate-pulse w-full h-full flex flex-col p-4">
    <div className="flex items-center justify-between mb-6">
      <div className="h-5 bg-border/60 rounded w-40"></div>
      <div className="flex gap-4">
        <div className="h-4 bg-border/60 rounded w-20"></div>
        <div className="h-4 bg-border/60 rounded w-20"></div>
      </div>
    </div>

    <div className="flex-1 flex items-end gap-3 px-2 pb-6 border-b border-border/40">
      {[40, 65, 35, 80, 55, 90, 45, 70, 50, 85, 60, 75].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-border/40 rounded-t-md transition-all"
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>

    <div className="flex justify-between mt-4 px-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-3 bg-border/40 rounded w-12"></div>
      ))}
    </div>
  </div>
)

export const DashboardChart: React.FC<DashboardChartProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
}) => {
  // Format Date Labels
  const formatPeriodLabel = (period: string) => {
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [year, month] = period.split('-')
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
        'en-US',
        { month: 'short', year: '2-digit' }
      )
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const [year, month, day] = period.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      })
    }

    return period
  }

  // Map Data
  const chartData = useMemo(() => {
    if (!data?.data) return []
    return data.data.map((item) => ({
      period: formatPeriodLabel(item.period),
      'Units sold': item.unitsSold,
      'Advertising cost': item.advertisingCost,
      Refunds: item.refunds,
      'Net profit': item.netProfit,
    }))
  }, [data])

  // Calculate Quick Summary Header Badges
  const totals = useMemo(() => {
    if (!data?.data || data.data.length === 0) return null
    return data.data.reduce(
      (acc, item) => ({
        netProfit: acc.netProfit + (item.netProfit || 0),
        unitsSold: acc.unitsSold + (item.unitsSold || 0),
        adCost: acc.adCost + (item.advertisingCost || 0),
      }),
      { netProfit: 0, unitsSold: 0, adCost: 0 }
    )
  }, [data])

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col border border-border/60 shadow-sm rounded-xl">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-text-primary">
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4">
          <div className="flex-1 min-h-[340px]">
            <ChartSkeleton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col border border-border/60 shadow-sm rounded-xl">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-text-primary">
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center text-danger-600 font-semibold text-lg">
              !
            </div>
            <p className="text-sm font-medium text-danger-600">
              Failed to load chart metrics
            </p>
            <p className="text-xs text-text-muted">
              Please try applying filters again or refresh the page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="h-full flex flex-col border border-border/60 shadow-sm rounded-xl">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-text-primary">
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="text-text-muted/60 text-2xl">📊</div>
            <p className="text-sm font-medium text-text-primary">
              No performance data available
            </p>
            <p className="text-xs text-text-muted">
              Try adjusting your date range or marketplace selection.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm rounded-xl bg-surface-primary">
      {/* Header with Quick Metric Badges */}
      <CardHeader className="pb-3 border-b border-border/40 flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-text-primary">
            Performance Overview
          </CardTitle>
          <p className="text-xs text-text-muted mt-0.5">
            Revenue, costs, and profit trends across selected periods
          </p>
        </div>

        {totals && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Total Net Profit
              </span>
              <span
                className={`text-sm font-bold ${
                  totals.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(totals.netProfit, currency)}
              </span>
            </div>

            <div className="h-7 w-[1px] bg-border/60 hidden sm:block" />

            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Total Units
              </span>
              <span className="text-sm font-bold text-text-primary">
                {formatNumber(totals.unitsSold, 0)}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Main Chart Section */}
      <CardContent className="flex-1 flex flex-col min-h-0 pt-6 pb-4 px-4">
        <div className="flex-1 min-h-[350px] w-full">
          <CombinationChart
            data={chartData}
            xKey="period"
            barSeries={[
              {
                key: 'Sales revenue',
                name: 'Sales Revenue',
                color: '#3b82f6', // Bright Blue
                yAxisId: 'left',
                opacity: 0.85,
                radius: [6, 6, 0, 0],
              },
              {
                key: 'Net profit',
                name: 'Net Profit',
                color: '#10b981', // Emerald Green
                yAxisId: 'left',
                opacity: 0.9,
                radius: [6, 6, 0, 0],
              },
              {
                key: 'Advertising cost',
                name: 'Ad Cost',
                color: '#f43f5e', // Rose
                yAxisId: 'left',
                opacity: 0.85,
                radius: [6, 6, 0, 0],
              },
            ]}
            lineSeries={[
              {
                key: 'Units sold',
                name: 'Units Sold',
                color: '#6366f1', // Indigo
                yAxisId: 'right',
                type: 'line',
                showDots: true,
                strokeWidth: 2.5,
              },
            ]}
            className="h-full w-full"
            leftYAxisFormatter={(val: number) => formatCurrency(val, currency)}
            rightYAxisFormatter={(val: number) => formatNumber(val, 0)}
            tooltipFormatter={(value: number, name: string) => {
              if (name === 'Units Sold' || name === 'Units sold') {
                return [formatNumber(value, 0), 'Units Sold']
              }
              return [formatCurrency(value, currency), name]
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default DashboardChart