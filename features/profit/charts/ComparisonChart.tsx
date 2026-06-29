"use client"

import React from 'react'
import { LineChart, ChartPalette } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { ComparisonResponse } from '@/services/api/charts.api'
import { ChartContainer } from './ChartContainer'

export interface ComparisonChartProps {
  data?: ComparisonResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <ChartContainer title="Period Comparison">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </ChartContainer>
    )
  }

  if (error) {
    return (
      <ChartContainer title="Period Comparison">
        <div className="text-sm text-danger-600">Failed to load comparison chart</div>
      </ChartContainer>
    )
  }

  if (!data) {
    return (
      <ChartContainer title="Period Comparison">
        <div className="text-sm text-text-muted">No comparison data</div>
      </ChartContainer>
    )
  }

  const chartRows = data.current.data.map((point, index) => ({
    period: point.period,
    current: point.value,
    previous: data.previous.data[index]?.value || 0,
  }))

  return (
    <ChartContainer
      title="Period Comparison"
      subtitle={`Current: ${new Date(data.currentRange.startDate).toLocaleDateString()} - ${new Date(
        data.currentRange.endDate
      ).toLocaleDateString()}`}
      exportRows={chartRows}
      className={className}
    >
      <LineChart
        data={chartRows.map((row) => ({
          period: row.period,
          'Current Period': row.current,
          'Previous Period': row.previous,
        }))}
        xKey="period"
        yKeys={[
          { key: 'Current Period', name: 'Current Period', color: ChartPalette.primary },
          { key: 'Previous Period', name: 'Previous Period', color: ChartPalette.neutral },
        ]}
        height={320}
      />
    </ChartContainer>
  )
}

