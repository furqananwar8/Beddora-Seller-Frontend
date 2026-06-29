'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { BarChart } from '@/design-system/charts'
import { ChartPalette } from '@/design-system/charts/ChartPalette'
import { EmailStatsResponse } from '@/types/emailTemplates.types'
import { Spinner } from '@/design-system/loaders'

export interface EmailStatisticsChartProps {
  data?: EmailStatsResponse
  isLoading?: boolean
  error?: any
}

export const EmailStatisticsChart: React.FC<EmailStatisticsChartProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
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
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load email statistics.</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const chartData = [
    { metric: 'Open Rate', value: data.openRate },
    { metric: 'Click Rate', value: data.clickRate },
    { metric: 'Response Rate', value: data.responseRate },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
          <div className="rounded-lg border border-border-subtle p-3">
            <div className="text-text-muted">Sent</div>
            <div className="text-lg font-semibold">{data.totalSent}</div>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <div className="text-text-muted">Pending</div>
            <div className="text-lg font-semibold">{data.totalPending}</div>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <div className="text-text-muted">Failed</div>
            <div className="text-lg font-semibold">{data.totalFailed}</div>
          </div>
        </div>
        <BarChart
          data={chartData}
          xKey="metric"
          yKeys={[{ key: 'value', name: 'Rate', color: ChartPalette.primary }]}
          height={280}
        />
      </CardContent>
    </Card>
  )
}

