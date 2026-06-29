'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryStockItem } from '@/types/inventoryStock.types'
import { formatDateTime, formatNumber } from '@/utils/format'

export interface InventoryTableProps {
  items?: InventoryStockItem[]
  isLoading?: boolean
  error?: any
}

const statusVariantMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  normal: { label: 'Normal', variant: 'success' },
  low: { label: 'Low', variant: 'warning' },
  out_of_stock: { label: 'Out', variant: 'error' },
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
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
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load inventory data.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No inventory records found.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Levels</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const statusConfig = statusVariantMap[item.status]
              return (
                <TableRow key={`${item.sku}-${item.marketplaceId || 'global'}`}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.marketplace?.name || item.marketplaceId || 'All'}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantityAvailable, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantityReserved, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.lowStockThreshold, 0)}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant} size="sm">
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {item.lastSyncedAt ? formatDateTime(item.lastSyncedAt) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

