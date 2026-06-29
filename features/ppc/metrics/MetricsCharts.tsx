'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { LineChart } from '@/design-system/charts'
import { Spinner } from '@/design-system/loaders'
import { PPCMetricsOverview } from '@/types/ppcMetrics.types'
import { ChartPalette } from '@/design-system/charts/ChartPalette'

export interface MetricsChartsProps {
  data?: PPCMetricsOverview
  isLoading?: boolean
  error?: any
}

export const MetricsCharts: React.FC<MetricsChartsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Metrics Trends</CardTitle>
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
          <CardTitle>PPC Metrics Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load metrics trends.</div>
        </CardContent>
      </Card>
    )
  }

  const trendData =
    data?.trend.map((item) => ({
      date: item.date,
      Spend: item.spend,
      Sales: item.sales,
      ACOS: item.acos,
      ROI: item.roi,
    })) || []

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Metrics Trends</CardTitle>
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
        <CardTitle>PPC Metrics Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          data={trendData}
          xKey="date"
          yKeys={[
            { key: 'Spend', name: 'Spend', color: ChartPalette.primary },
            { key: 'Sales', name: 'Sales', color: ChartPalette.success },
            { key: 'ACOS', name: 'ACOS', color: ChartPalette.warning },
            { key: 'ROI', name: 'ROI', color: ChartPalette.accent },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  )
}

