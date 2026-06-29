'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { InboundShipment } from '@/types/purchaseOrders.types'
import { formatDate, formatNumber } from '@/utils/format'

export interface InboundShipmentTableProps {
  items?: InboundShipment[]
  isLoading?: boolean
  error?: any
}

export const InboundShipmentTable: React.FC<InboundShipmentTableProps> = ({
  items,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inbound Shipments</CardTitle>
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
          <CardTitle>Inbound Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load inbound shipments.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inbound Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No inbound shipments found.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbound Shipments</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Shipped</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ship Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell>{shipment.purchaseOrder?.poNumber || shipment.purchaseOrderId}</TableCell>
                <TableCell className="font-medium">{shipment.sku}</TableCell>
                <TableCell className="text-right">{formatNumber(shipment.quantityShipped, 0)}</TableCell>
                <TableCell className="text-right">{formatNumber(shipment.quantityReceived, 0)}</TableCell>
                <TableCell>{shipment.status}</TableCell>
                <TableCell>{formatDate(shipment.shipmentDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

