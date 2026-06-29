'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { PurchaseOrderItem } from '@/services/api/purchaseOrders.api'
import { formatDate, formatNumber } from '@/utils/format'

export interface PurchaseOrderDetailProps {
  data?: PurchaseOrderItem
  isLoading?: boolean
  error?: any
}

export const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Detail</CardTitle>
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
          <CardTitle>Purchase Order Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load purchase order.</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PO {data.poNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-sm text-text-muted">Supplier</div>
            <div className="font-medium">{data.supplier?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Estimated Delivery</div>
            <div className="font-medium">
              {data.estimatedArrival ? formatDate(data.estimatedArrival) : '—'}
            </div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Status</div>
            <div className="font-medium">{data.status}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.products?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.sku}</TableCell>
                <TableCell className="text-right">{formatNumber(item.quantity, 0)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.unitCost, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.quantity * item.unitCost, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

