'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryStockAlert } from '@/types/inventoryStock.types'
import { formatNumber } from '@/utils/format'

export interface LowStockAlertListProps {
  alerts?: InventoryStockAlert[]
  isLoading?: boolean
  error?: any
}

export const LowStockAlertList: React.FC<LowStockAlertListProps> = ({
  alerts,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
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
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load alerts.</div>
        </CardContent>
      </Card>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No low stock alerts.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Alerts</CardTitle>
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
                  {formatNumber(alert.quantityAvailable, 0)} / {formatNumber(alert.lowStockThreshold, 0)}
                </div>
                <Badge variant="warning" size="sm">
                  Low Stock
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

