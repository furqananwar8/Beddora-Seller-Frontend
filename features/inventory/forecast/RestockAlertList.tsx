'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryForecastAlert } from '@/types/inventoryForecast.types'
import { formatNumber } from '@/utils/format'

export interface RestockAlertListProps {
  alerts?: InventoryForecastAlert[]
  isLoading?: boolean
  error?: any
}

export const RestockAlertList: React.FC<RestockAlertListProps> = ({
  alerts,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restock Alerts</CardTitle>
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
          <CardTitle>Restock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load restock alerts.</div>
        </CardContent>
      </Card>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No restock alerts.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restock Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={`${alert.sku}-${alert.marketplaceId || 'global'}`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div>
                <div className="font-medium">{alert.sku}</div>
                <div className="text-xs text-text-muted">
                  {alert.marketplace?.name || alert.marketplaceId || 'All marketplaces'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-text-muted">
                  {formatNumber(alert.forecast7Day, 0)} / {formatNumber(alert.restockThreshold, 0)}
                </div>
                <Badge variant="warning" size="sm">
                  Restock
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

