'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner, ChartSkeleton } from '@/design-system/loaders'
import { DashboardChartResponse } from '@/services/api/charts.api'
import { formatCurrency, formatNumber } from '@/utils/format'

// Lazy-load the heavy CombinationChart component (includes Recharts)
const CombinationChart = dynamic(
  () => import('@/design-system/charts/CombinationChart').then((mod) => mod.CombinationChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <ChartSkeleton height="400px" />
      </div>
    ),
  }
)

export interface DashboardChartProps {
  data?: DashboardChartResponse
  isLoading?: boolean
  error?: any
  currency?: string
}

/**
 * Dashboard Chart Component
 * 
 * Displays a combination chart with:
 * - Units sold (line, right Y-axis)
 * - Advertising cost (bars, left Y-axis)
 * - Refunds (line, left Y-axis)
 * - Net profit (bars, left Y-axis)
 */
export const DashboardChart: React.FC<DashboardChartProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-danger-600">Failed to load chart data</div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-text-muted">No chart data available</div>
        </CardContent>
      </Card>
    )
  }

  // Format period labels for display
  const formatPeriodLabel = (period: string) => {
    // If period is in format "YYYY-MM", format as "MMM YYYY"
    if (period.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = period.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    // If period is in format "YYYY-MM-DD", format as "DD MMM YYYY"
    if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(period)
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return period
  }

  const chartData = data.data.map((item) => ({
    period: formatPeriodLabel(item.period),
    'Units sold': item.unitsSold,
    'Advertising cost': item.advertisingCost,
    Refunds: item.refunds,
    'Net profit': item.netProfit,
  }))

  const currencySymbol = currency === 'CAD' ? 'C$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <CombinationChart
            data={chartData}
            xKey="period"
            lineSeries={[
              {
                key: 'Units sold',
                name: 'Units sold',
                color: '#3b82f6', // Blue
                yAxisId: 'right',
              },
              {
                key: 'Refunds',
                name: 'Refunds',
                color: '#ec4899', // Pink
                yAxisId: 'left',
              },
            ]}
            barSeries={[
              {
                key: 'Advertising cost',
                name: 'Advertising cost',
                color: '#ef4444', // Red
                yAxisId: 'left',
              },
              {
                key: 'Net profit',
                name: 'Net profit',
                color: '#60a5fa', // Light blue
                yAxisId: 'left',
              },
            ]}
            className="h-full"
            leftYAxisLabel={`${currencySymbol} Amount`}
            rightYAxisLabel="Units"
            leftYAxisFormatter={(value) => formatCurrency(value, currency)}
            rightYAxisFormatter={(value) => formatNumber(value, 0)}
            tooltipFormatter={(value, name) => {
              if (name === 'Units sold') {
                return [formatNumber(value as number, 0), name]
              }
              return [formatCurrency(value as number, currency), name]
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
