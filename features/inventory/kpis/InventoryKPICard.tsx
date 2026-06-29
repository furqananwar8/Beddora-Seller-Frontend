'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { InventoryKpiResponse } from '@/types/inventoryKpis.types'
import { formatNumber } from '@/utils/format'

export interface InventoryKPICardProps {
  data?: InventoryKpiResponse
  isLoading?: boolean
  error?: any
}

export const InventoryKPICard: React.FC<InventoryKPICardProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory KPIs</CardTitle>
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
          <CardTitle>Inventory KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load inventory KPIs.</div>
        </CardContent>
      </Card>
    )
  }

  const items = data?.data || []
  const avgDsl = items.length ? items.reduce((sum, item) => sum + item.daysOfStockLeft, 0) / items.length : 0
  const overstockCount = items.filter((item) => item.overstockRisk).length
  const lowCount = items.filter((item) => item.status === 'low').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory KPIs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-text-muted">Avg Days of Stock Left</div>
            <div className="text-xl font-semibold">{formatNumber(avgDsl, 1)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Overstock SKUs</div>
            <div className="text-xl font-semibold">{formatNumber(overstockCount, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Low Stock SKUs</div>
            <div className="text-xl font-semibold">{formatNumber(lowCount, 0)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

