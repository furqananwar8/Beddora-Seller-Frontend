'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { InventoryStockSummary } from '@/types/inventoryStock.types'
import { formatNumber } from '@/utils/format'

export interface InventoryCardProps {
  summary?: InventoryStockSummary
  isLoading?: boolean
  error?: any
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ summary, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
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
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load inventory summary.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-text-muted">Total Stock</div>
            <div className="text-xl font-semibold">{formatNumber(summary?.totalStock || 0, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Reserved</div>
            <div className="text-xl font-semibold">{formatNumber(summary?.totalReserved || 0, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Low Stock</div>
            <div className="text-xl font-semibold">{formatNumber(summary?.lowStockCount || 0, 0)}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Out of Stock</div>
            <div className="text-xl font-semibold">{formatNumber(summary?.outOfStockCount || 0, 0)}</div>
          </div>
        </div>
        {typeof summary?.pendingShipments === 'number' && (
          <div className="mt-4 text-sm text-text-muted">
            Pending Shipments: {formatNumber(summary.pendingShipments, 0)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

