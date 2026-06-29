"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ChartPalette } from '@/design-system/charts'
import { Tabs } from '@/design-system/tabs'
import { Spinner, ChartSkeleton } from '@/design-system/loaders'
import { ChartResponse, ChartPeriod } from '@/services/api/charts.api'

// Lazy-load the heavy LineChart component (includes Recharts)
const LineChart = dynamic(
  () => import('@/design-system/charts/LineChart').then((mod) => mod.LineChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <ChartSkeleton height="300px" />
      </div>
    ),
  }
)

export interface RevenueProfitTrendCardProps {
  data?: ChartResponse
  period: ChartPeriod
  onPeriodChange: (period: ChartPeriod) => void
  isLoading?: boolean
  error?: any
}

export const RevenueProfitTrendCard: React.FC<RevenueProfitTrendCardProps> = ({
  data,
  period,
  onPeriodChange,
  isLoading,
  error,
}) => {
  const tabItems = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ]

  const chartRows = data?.series?.[0]?.data.map((point, index) => ({
    period: point.period,
    revenue: data.series[1]?.data[index]?.value || 0,
    profit: point.value,
  })) || []

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Revenue & Profit Trend</CardTitle>
          <p className="text-sm text-text-muted mt-1">
            {data ? `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}` : 'Select a range'}
          </p>
        </div>
        <Tabs
          items={tabItems}
          activeTab={period}
          onChange={(tabId) => onPeriodChange(tabId as ChartPeriod)}
          size="sm"
        />
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}
        {error && <div className="text-sm text-danger-600">Failed to load trend data</div>}
        {!isLoading && !error && chartRows.length === 0 && (
          <div className="text-sm text-text-muted">No trend data available</div>
        )}
        {!isLoading && !error && chartRows.length > 0 && (
          <LineChart
            data={chartRows.map((row) => ({
              period: row.period,
              Revenue: row.revenue,
              Profit: row.profit,
            }))}
            xKey="period"
            yKeys={[
              { key: 'Revenue', name: 'Revenue', color: ChartPalette.primary },
              { key: 'Profit', name: 'Profit', color: ChartPalette.success },
            ]}
            height={280}
          />
        )}
      </CardContent>
    </Card>
  )
}

