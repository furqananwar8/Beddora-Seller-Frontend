'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { LineChart } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { PPCProfitOverview } from '@/types/ppcProfitMetrics.types'
import { ChartPalette } from '@/design-system/charts/ChartPalette'

export interface ProfitMetricsChartsProps {
  data?: PPCProfitOverview
  isLoading?: boolean
  error?: any
}

export const ProfitMetricsCharts: React.FC<ProfitMetricsChartsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Profit Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load trends.</div>
        </CardContent>
      </Card>
    )
  }

  const trendData =
    data?.trend.map((item) => ({
      date: item.date,
      Spend: item.spend,
      Sales: item.sales,
      Profit: item.estimatedProfit,
    })) || []

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No trend data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PPC Profit Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          data={trendData}
          xKey="date"
          yKeys={[
            { key: 'Spend', name: 'Spend', color: ChartPalette.warning },
            { key: 'Sales', name: 'Sales', color: ChartPalette.success },
            { key: 'Profit', name: 'Profit', color: ChartPalette.primary },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  )
}

