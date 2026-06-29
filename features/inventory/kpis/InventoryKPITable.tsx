'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryKpiItem } from '@/types/inventoryKpis.types'
import { formatNumber } from '@/utils/format'

export interface InventoryKPITableProps {
  items?: InventoryKpiItem[]
  isLoading?: boolean
  error?: any
}

const statusVariant: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  normal: { label: 'Normal', variant: 'success' },
  low: { label: 'Low', variant: 'warning' },
  overstock: { label: 'Overstock', variant: 'error' },
}

export const InventoryKPITable: React.FC<InventoryKPITableProps> = ({ items, isLoading, error }) => {
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
          <div className="text-danger-600 text-sm">Failed to load KPI data.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No KPI data found.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory KPIs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead className="text-right">Days of Stock Left</TableHead>
              <TableHead className="text-right">Overstock Risk</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const config = statusVariant[item.status] || statusVariant.normal
              return (
                <TableRow key={`${item.sku}-${item.marketplaceId || 'global'}`}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.marketplace?.name || item.marketplaceId || 'All'}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.daysOfStockLeft, 1)}</TableCell>
                  <TableCell className="text-right">
                    {item.overstockRisk ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant} size="sm">
                      {config.label}
                    </Badge>
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

