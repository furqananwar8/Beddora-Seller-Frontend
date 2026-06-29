"use client"

import React from 'react'
import { LineChart, ChartPalette } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { ChartResponse } from '@/services/api/charts.api'
import { ChartContainer } from './ChartContainer'

export interface ProfitTrendChartProps {
  data?: ChartResponse
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
      <ChartContainer title="Profit Trend">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </ChartContainer>
    )
  }

  if (error) {
    return (
      <ChartContainer title="Profit Trend">
        <div className="text-sm text-danger-600">Failed to load profit trend</div>
      </ChartContainer>
    )
  }

  if (!data || data.series.length === 0) {
    return (
      <ChartContainer title="Profit Trend">
        <div className="text-sm text-text-muted">No profit trend data</div>
      </ChartContainer>
    )
  }

  const chartRows = data.series[0].data.map((point, index) => ({
    period: point.period,
    netProfit: point.value,
    salesRevenue: data.series[1]?.data[index]?.value || 0,
  }))

  return (
    <ChartContainer
      title="Profit Trend"
      subtitle={`${data.period} view • ${new Date(data.startDate).toLocaleDateString()} - ${new Date(
        data.endDate
      ).toLocaleDateString()}`}
      exportRows={chartRows}
      className={className}
    >
      <LineChart
        data={chartRows.map((row) => ({
          period: row.period,
          'Net Profit': row.netProfit,
          'Sales Revenue': row.salesRevenue,
        }))}
        xKey="period"
        yKeys={[
          { key: 'Sales Revenue', name: 'Sales Revenue', color: ChartPalette.primary },
          { key: 'Net Profit', name: 'Net Profit', color: ChartPalette.success },
        ]}
        height={320}
      />
    </ChartContainer>
  )
}

