'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { BuyBoxAlertItem } from '@/types/buyBoxAlerts.types'

export interface BuyBoxAlertTableProps {
  items?: BuyBoxAlertItem[]
  isLoading?: boolean
  error?: any
  onSelect?: (alert: BuyBoxAlertItem) => void
  onMarkRead?: (id: string) => void
  onResolve?: (id: string) => void
}

const statusVariant = (status: BuyBoxAlertItem['status']) => {
  if (status === 'resolved') return 'success'
  if (status === 'read') return 'secondary'
  return 'warning'
}

export const BuyBoxAlertTable: React.FC<BuyBoxAlertTableProps> = ({
  items,
  isLoading,
  error,
  onSelect,
  onMarkRead,
  onResolve,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Box Alerts</CardTitle>
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
          <CardTitle>Buy Box Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load Buy Box alerts.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Box Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No Buy Box alerts found.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Box Alerts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ASIN</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lost Buy Box</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} onClick={() => onSelect?.(item)} className="cursor-pointer">
                <TableCell className="font-medium">{item.asin}</TableCell>
                <TableCell>{item.sku || '—'}</TableCell>
                <TableCell>{item.marketplaceId}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </TableCell>
                <TableCell>{item.lostBuyBox ? 'Yes' : 'No'}</TableCell>
                <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation()
                        onMarkRead?.(item.id)
                      }}
                      disabled={item.status !== 'unread'}
                    >
                      Mark Read
                    </Button>
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation()
                        onResolve?.(item.id)
                      }}
                      disabled={item.status === 'resolved'}
                    >
                      Resolve
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

