'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import {
  FbaInventoryAlert,
  FbaInventoryAlertFilters,
  FbaAlertType,
  FbaAlertStatus,
} from '@/services/api/fbaInventory.api'
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/format'

export interface FbaInventoryAlertTableProps {
  alerts?: FbaInventoryAlert[]
  isLoading?: boolean
  error?: any
  filters?: FbaInventoryAlertFilters
  onFilterChange?: (filters: FbaInventoryAlertFilters) => void
  onResolve?: (alertId: string, status: FbaAlertStatus, notes?: string) => void
  onViewDetails?: (alert: FbaInventoryAlert) => void
}

export const FbaInventoryAlertTable: React.FC<FbaInventoryAlertTableProps> = ({
  alerts = [],
  isLoading,
  error,
  filters,
  onFilterChange,
  onResolve,
  onViewDetails,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<FbaInventoryAlert | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')

  const handleResolve = (alert: FbaInventoryAlert, status: FbaAlertStatus) => {
    if (status === 'reimbursed' || status === 'disputed') {
      setSelectedAlert(alert)
      setResolveNotes('')
    } else {
      onResolve?.(alert.id, status)
    }
  }

  const confirmResolve = () => {
    if (selectedAlert) {
      onResolve?.(selectedAlert.id, selectedAlert.status === 'pending' ? 'reimbursed' : 'disputed', resolveNotes)
      setSelectedAlert(null)
      setResolveNotes('')
    }
  }

  const getAlertTypeBadge = (type: FbaAlertType) => {
    return (
      <Badge variant={type === 'lost' ? 'error' : 'warning'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: FbaAlertStatus) => {
    const variants: Record<FbaAlertStatus, 'success' | 'warning' | 'error' | 'secondary'> = {
      pending: 'warning',
      reimbursed: 'success',
      ignored: 'secondary',
      disputed: 'error',
    }
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FBA Inventory Alerts</CardTitle>
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
          <CardTitle>FBA Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load FBA inventory alerts.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>FBA Inventory Alerts</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filters?.alertType || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    alertType: e.target.value === 'all' ? undefined : (e.target.value as FbaAlertType),
                  })
                }
                className="text-sm border border-border rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
              <select
                value={filters?.status || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    status: e.target.value === 'all' ? undefined : (e.target.value as FbaAlertStatus),
                  })
                }
                className="text-sm border border-border rounded px-2 py-1"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reimbursed">Reimbursed</option>
                <option value="ignored">Ignored</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">
              No FBA inventory alerts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Estimated Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{getAlertTypeBadge(alert.alertType)}</TableCell>
                    <TableCell className="font-medium">
                      {alert.product?.title || 'Unknown Product'}
                    </TableCell>
                    <TableCell>{alert.sku || alert.product?.sku || '-'}</TableCell>
                    <TableCell>{alert.marketplace?.name || alert.marketplaceId}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Reported: {alert.reportedQuantity}</div>
                        {alert.reimbursedQuantity > 0 && (
                          <div className="text-text-muted">Reimbursed: {alert.reimbursedQuantity}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(alert.estimatedAmount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(alert.status)}</TableCell>
                    <TableCell>{formatDate(alert.detectedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {alert.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert, 'reimbursed')}
                            >
                              Mark Reimbursed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert, 'ignored')}
                            >
                              Ignore
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert, 'disputed')}
                            >
                              Dispute
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails?.(alert)}
                        >
                          Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {selectedAlert.status === 'pending' ? 'Mark as Reimbursed' : 'Dispute Alert'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add notes about this resolution..."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmResolve}>
                  {selectedAlert.status === 'pending' ? 'Mark Reimbursed' : 'Dispute'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

