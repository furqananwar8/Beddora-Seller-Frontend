"use client"

import React from 'react'
import { BarChart, ChartPalette } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { ChartResponse } from '@/services/api/charts.api'
import { ChartContainer } from './ChartContainer'

export interface SalesTrendChartProps {
  data?: ChartResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <ChartContainer title="Sales Trend">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </ChartContainer>
    )
  }

  if (error) {
    return (
      <ChartContainer title="Sales Trend">
        <div className="text-sm text-danger-600">Failed to load sales trend</div>
      </ChartContainer>
    )
  }

  if (!data || data.series.length === 0) {
    return (
      <ChartContainer title="Sales Trend">
        <div className="text-sm text-text-muted">No sales data</div>
      </ChartContainer>
    )
  }

  const chartRows = data.series[0].data.map((point) => ({
    period: point.period,
    sales: point.value,
  }))

  return (
    <ChartContainer
      title="Sales Trend"
      subtitle={`${data.period} view • ${new Date(data.startDate).toLocaleDateString()} - ${new Date(
        data.endDate
      ).toLocaleDateString()}`}
      exportRows={chartRows}
      className={className}
    >
      <BarChart
        data={chartRows.map((row) => ({
          period: row.period,
          'Sales Revenue': row.sales,
        }))}
        xKey="period"
        yKeys={[{ key: 'Sales Revenue', name: 'Sales Revenue', color: ChartPalette.primary }]}
        height={320}
      />
    </ChartContainer>
  )
}

