'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { PPCMetricsOverview } from '@/types/ppcMetrics.types'
import { formatNumber } from '@/utils/format'

export interface MetricsOverviewCardProps {
  data?: PPCMetricsOverview
  isLoading?: boolean
  error?: any
}

export const MetricsOverviewCard: React.FC<MetricsOverviewCardProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PPC Metrics Overview</CardTitle>
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
          <CardTitle>PPC Metrics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load PPC metrics.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PPC Metrics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-text-muted">Spend</div>
            <div className="text-xl font-semibold">{formatNumber(data?.totalSpend || 0, 2)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Sales</div>
            <div className="text-xl font-semibold">{formatNumber(data?.totalSales || 0, 2)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">ACOS</div>
            <div className="text-xl font-semibold">{formatNumber(data?.acos || 0, 2)}%</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">ROI</div>
            <div className="text-xl font-semibold">{formatNumber(data?.roi || 0, 2)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

