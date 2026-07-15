'use client'

import React from 'react'
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
    {/* Header mimic */}
    <div className="flex items-center justify-between mb-6">
      <div className="h-4 bg-border rounded w-32"></div>
      <div className="flex gap-3">
        <div className="h-3 bg-border rounded w-16"></div>
        <div className="h-3 bg-border rounded w-16"></div>
      </div>
    </div>

    {/* Chart area skeleton */}
    <div className="flex-1 flex items-end gap-3 px-2 pb-6 border-b border-border">
      {[40, 65, 35, 80, 55, 90, 45, 70, 50, 85, 60, 75].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-border/60 rounded-t"
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>

    {/* X-axis mimic */}
    <div className="flex justify-between mt-3 px-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-2.5 bg-border rounded w-12"></div>
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
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-[340px]">
            <ChartSkeleton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-sm text-danger-600">
            Failed to load chart data
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Profit Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-sm text-text-muted">No chart data available</div>
        </CardContent>
      </Card>
    )
  }

  const formatPeriodLabel = (period: string) => {
    if (period.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = period.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    }
    if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(period)
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
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

  const currencySymbol =
    currency === 'CAD'
      ? 'C$'
      : currency === 'USD'
        ? '$'
        : currency === 'EUR'
          ? '€'
          : currency

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Profit Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <CombinationChart
            data={chartData}
            xKey="period"
            lineSeries={[
              {
                key: 'Units sold',
                name: 'Units sold',
                color: '#3b82f6',
                yAxisId: 'right',
              },
              {
                key: 'Refunds',
                name: 'Refunds',
                color: '#ec4899',
                yAxisId: 'left',
              },
            ]}
            barSeries={[
              {
                key: 'Advertising cost',
                name: 'Advertising cost',
                color: '#ef4444',
                yAxisId: 'left',
              },
              {
                key: 'Net profit',
                name: 'Net profit',
                color: '#60a5fa',
                yAxisId: 'left',
              },
            ]}
            className="h-full"
            leftYAxisFormatter={(value: number) =>
              formatCurrency(value, currency)
            }
            rightYAxisFormatter={(value: number) => formatNumber(value, 0)}
            tooltipFormatter={(value: number, name: string) => {
              if (name === 'Units sold') {
                return [formatNumber(value, 0), name]
              }
              return [formatCurrency(value, currency), name]
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}