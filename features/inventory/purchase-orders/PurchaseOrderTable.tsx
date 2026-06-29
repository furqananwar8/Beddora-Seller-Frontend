'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { PurchaseOrderItem } from '@/services/api/purchaseOrders.api'
import { formatDate, formatNumber } from '@/utils/format'

export interface PurchaseOrderTableProps {
  items?: PurchaseOrderItem[]
  isLoading?: boolean
  error?: any
  onSelect?: (id: string) => void
}

const statusVariantMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'secondary' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  ordered: { label: 'Ordered', variant: 'warning' },
  shipped: { label: 'Shipped', variant: 'warning' },
  received: { label: 'Received', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  items,
  isLoading,
  error,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
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
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load purchase orders.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No purchase orders found.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((po) => {
              const statusConfig = statusVariantMap[po.status] || statusVariantMap.draft
              return (
                <TableRow key={po.id} onClick={() => onSelect?.(po.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.supplier?.name || '—'}</TableCell>
                  <TableCell className="text-right">{formatNumber(po.totalUnits, 0)}</TableCell>
                  <TableCell className="text-right">${formatNumber(po.totalCost, 2)}</TableCell>
                  <TableCell>
                    {po.estimatedArrival ? formatDate(po.estimatedArrival) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant} size="sm">
                      {statusConfig.label}
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

