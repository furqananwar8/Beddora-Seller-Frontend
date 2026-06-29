"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { BarChart } from '@/design-system/charts'
import { ReturnSummary } from '@/services/api/returns.api'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'

export interface ReturnsChartProps {
  summary?: ReturnSummary
  currency?: string
  isLoading?: boolean
  error?: any
  className?: string
}

type ChartView = 'trend' | 'reason' | 'marketplace'

export const ReturnsChart: React.FC<ReturnsChartProps> = ({
  summary,
  currency = 'USD',
  isLoading,
  error,
  className,
}) => {
  const [view, setView] = useState<ChartView>('trend')

  const chartData = useMemo(() => {
    if (!summary) return []

    if (view === 'trend') {
      return summary.trends.map((item) => ({
        period: item.period,
        refundAmount: item.refundAmount,
        feeAmount: item.feeAmount,
        units: item.units,
      }))
    }

    if (view === 'reason') {
      return Object.entries(summary.byReasonCode).map(([reasonCode, data]) => ({
        reasonCode,
        refundAmount: data.refundAmount,
        feeAmount: data.feeAmount,
        units: data.units,
      }))
    }

    return Object.entries(summary.byMarketplace).map(([marketplaceId, data]) => ({
      marketplaceId,
      refundAmount: data.refundAmount,
      feeAmount: data.feeAmount,
      units: data.units,
    }))
  }, [summary, view])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns Trends</CardTitle>
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
          <CardTitle>Returns Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load returns chart</div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No returns data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Returns Trends</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setView('trend')}
              className={`px-3 py-1 rounded text-sm ${
                view === 'trend' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'
              }`}
            >
              Trend
            </button>
            <button
              onClick={() => setView('reason')}
              className={`px-3 py-1 rounded text-sm ${
                view === 'reason' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'
              }`}
            >
              Reason
            </button>
            <button
              onClick={() => setView('marketplace')}
              className={`px-3 py-1 rounded text-sm ${
                view === 'marketplace'
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-700'
              }`}
            >
              Marketplace
            </button>
          </div>
        </div>
        <p className="text-sm text-secondary-500 mt-1">
          {formatCurrency(summary.totalRefundAmount + summary.totalFeeAmount, currency)} total impact
        </p>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          xKey={view === 'trend' ? 'period' : view === 'reason' ? 'reasonCode' : 'marketplaceId'}
          yKeys={[
            { key: 'refundAmount', name: 'Refund Amount', color: '#ef4444' },
            { key: 'feeAmount', name: 'Fee Amount', color: '#f97316' },
            { key: 'units', name: 'Units', color: '#0ea5e9' },
          ]}
          height={320}
        />
      </CardContent>
    </Card>
  )
}

