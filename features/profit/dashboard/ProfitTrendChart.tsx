'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner, ChartSkeleton } from '@/design-system/loaders'
import { ProfitTrendsResponse } from '@/services/api/profit.api'

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

/**
 * ProfitTrendChart component
 * 
 * Displays profit trends over time using a line chart
 * Shows revenue, gross profit, and net profit trends
 */
export interface ProfitTrendChartProps {
  data?: ProfitTrendsResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const ProfitTrendChart: React.FC<ProfitTrendChartProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">
            Failed to load trend data. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No trend data available</div>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const chartData = data.data.map((item) => ({
    date: item.date,
    'Sales Revenue': item.salesRevenue,
    'Gross Profit': item.grossProfit,
    'Net Profit': item.netProfit,
    'Total Expenses': item.totalExpenses,
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Profit Trends</CardTitle>
        <p className="text-sm text-secondary-500 mt-1">
          {data.period.charAt(0).toUpperCase() + data.period.slice(1)}ly view •{' '}
          {new Date(data.startDate).toLocaleDateString()} -{' '}
          {new Date(data.endDate).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        <LineChart
          data={chartData}
          xKey="date"
          yKeys={[
            { key: 'Sales Revenue', name: 'Sales Revenue', color: '#0ea5e9' },
            { key: 'Gross Profit', name: 'Gross Profit', color: '#22c55e' },
            { key: 'Net Profit', name: 'Net Profit', color: '#8b5cf6' },
            { key: 'Total Expenses', name: 'Total Expenses', color: '#ef4444' },
          ]}
          height={400}
        />
      </CardContent>
    </Card>
  )
}

