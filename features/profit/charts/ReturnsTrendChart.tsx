"use client"

import React from 'react'
import { BarChart, ChartPalette } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { ChartResponse } from '@/services/api/charts.api'
import { ChartContainer } from './ChartContainer'

export interface ReturnsTrendChartProps {
  data?: ChartResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const ReturnsTrendChart: React.FC<ReturnsTrendChartProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <ChartContainer title="Returns Trend">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </ChartContainer>
    )
  }

  if (error) {
    return (
      <ChartContainer title="Returns Trend">
        <div className="text-sm text-danger-600">Failed to load returns trend</div>
      </ChartContainer>
    )
  }

  if (!data || data.series.length === 0) {
    return (
      <ChartContainer title="Returns Trend">
        <div className="text-sm text-text-muted">No returns data</div>
      </ChartContainer>
    )
  }

  const chartRows = data.series[0].data.map((point) => ({
    period: point.period,
    returns: point.value,
  }))

  return (
    <ChartContainer
      title="Returns Trend"
      subtitle={`${data.period} view • ${new Date(data.startDate).toLocaleDateString()} - ${new Date(
        data.endDate
      ).toLocaleDateString()}`}
      exportRows={chartRows}
      className={className}
    >
      <BarChart
        data={chartRows.map((row) => ({
          period: row.period,
          'Returns Cost': row.returns,
        }))}
        xKey="period"
        yKeys={[{ key: 'Returns Cost', name: 'Returns Cost', color: ChartPalette.danger }]}
        height={320}
      />
    </ChartContainer>
  )
}

