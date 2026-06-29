'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { InventoryForecastItem } from '@/types/inventoryForecast.types'
import { formatDateTime, formatNumber } from '@/utils/format'

export interface ForecastTableProps {
  items?: InventoryForecastItem[]
  isLoading?: boolean
  error?: any
}

export const ForecastTable: React.FC<ForecastTableProps> = ({ items, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast by SKU</CardTitle>
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
          <CardTitle>Forecast by SKU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load forecast data.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast by SKU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No forecast data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast by SKU</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead className="text-right">Velocity</TableHead>
              <TableHead className="text-right">3 Day</TableHead>
              <TableHead className="text-right">7 Day</TableHead>
              <TableHead className="text-right">30 Day</TableHead>
              <TableHead className="text-right">Reorder Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Calculated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const needsRestock = item.forecast7Day <= item.restockThreshold
              return (
                <TableRow key={`${item.sku}-${item.marketplaceId || 'global'}`}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.marketplace?.name || item.marketplaceId || 'All'}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.salesVelocity, 2)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.forecast3Day, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.forecast7Day, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.forecast30Day, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.suggestedReorderQty, 0)}</TableCell>
                  <TableCell>
                    {needsRestock ? (
                      <Badge variant="warning" size="sm">
                        Restock
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Healthy
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {item.lastCalculatedAt ? formatDateTime(item.lastCalculatedAt) : '—'}
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

