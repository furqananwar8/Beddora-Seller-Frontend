"use client"

import React from 'react'
import { LineChart, ChartPalette } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { ChartResponse } from '@/services/api/charts.api'
import { ChartContainer } from './ChartContainer'

export interface PPCCostChartProps {
  data?: ChartResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const PPCCostChart: React.FC<PPCCostChartProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <ChartContainer title="PPC Costs">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </ChartContainer>
    )
  }

  if (error) {
    return (
      <ChartContainer title="PPC Costs">
        <div className="text-sm text-danger-600">Failed to load PPC trend</div>
      </ChartContainer>
    )
  }

  if (!data || data.series.length === 0) {
    return (
      <ChartContainer title="PPC Costs">
        <div className="text-sm text-text-muted">No PPC data</div>
      </ChartContainer>
    )
  }

  const chartRows = data.series[0].data.map((point) => ({
    period: point.period,
    spend: point.value,
  }))

  return (
    <ChartContainer
      title="PPC Costs"
      subtitle={`${data.period} view • ${new Date(data.startDate).toLocaleDateString()} - ${new Date(
        data.endDate
      ).toLocaleDateString()}`}
      exportRows={chartRows}
      className={className}
    >
      <LineChart
        data={chartRows.map((row) => ({
          period: row.period,
          'PPC Spend': row.spend,
        }))}
        xKey="period"
        yKeys={[{ key: 'PPC Spend', name: 'PPC Spend', color: ChartPalette.warning }]}
        height={320}
      />
    </ChartContainer>
  )
}

