'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner, ChartSkeleton } from '@/design-system/loaders'
import { PPCOverview } from '@/types/ppcDashboard.types'
import { ChartPalette } from '@/design-system/charts/ChartPalette'

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

export interface PPCChartsProps {
  data?: PPCOverview
  isLoading?: boolean
  error?: any
}

export const PPCCharts: React.FC<PPCChartsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Trends</CardTitle>
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
          <CardTitle>PPC Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load PPC trends.</div>
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
          <CardTitle>PPC Trends</CardTitle>
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
        <CardTitle>PPC Trends</CardTitle>
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

