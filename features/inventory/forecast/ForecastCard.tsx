'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { InventoryForecastResponse } from '@/types/inventoryForecast.types'
import { formatNumber } from '@/utils/format'

export interface ForecastCardProps {
  data?: InventoryForecastResponse
  isLoading?: boolean
  error?: any
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast Summary</CardTitle>
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
          <CardTitle>Forecast Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load forecast summary.</div>
        </CardContent>
      </Card>
    )
  }

  const totalSkus = data?.total || 0
  const alertCount = data?.data.filter((item) => item.forecast7Day <= item.restockThreshold).length || 0
  const avgVelocity =
    data?.data.length
      ? data.data.reduce((sum, item) => sum + item.salesVelocity, 0) / data.data.length
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-text-muted">SKUs Forecasted</div>
            <div className="text-xl font-semibold">{formatNumber(totalSkus, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Restock Alerts</div>
            <div className="text-xl font-semibold">{formatNumber(alertCount, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Avg Velocity (units/day)</div>
            <div className="text-xl font-semibold">{formatNumber(avgVelocity, 2)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

