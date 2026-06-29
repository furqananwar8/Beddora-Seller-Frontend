'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryKpiItem } from '@/types/inventoryKpis.types'
import { formatNumber } from '@/utils/format'

export interface KPIAlertsProps {
  items?: InventoryKpiItem[]
  isLoading?: boolean
  error?: any
}

export const KPIAlerts: React.FC<KPIAlertsProps> = ({ items, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPI Alerts</CardTitle>
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
          <CardTitle>KPI Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load KPI alerts.</div>
        </CardContent>
      </Card>
    )
  }

  const alertItems = (items || []).filter((item) => item.status !== 'normal')

  if (alertItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPI Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No KPI alerts.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertItems.map((item) => (
          <div
            key={`${item.sku}-${item.marketplaceId || 'global'}`}
            className="flex items-center justify-between border border-border rounded-lg px-4 py-3"
          >
            <div>
              <div className="font-medium">{item.sku}</div>
              <div className="text-xs text-text-muted">
                {item.marketplace?.name || item.marketplaceId || 'All marketplaces'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-text-muted">
                DSL: {formatNumber(item.daysOfStockLeft, 1)}
              </div>
              <Badge variant={item.status === 'overstock' ? 'error' : 'warning'} size="sm">
                {item.status === 'overstock' ? 'Overstock' : 'Low'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

