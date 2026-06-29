'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import {
  RefundDiscrepancy,
  RefundDiscrepancyFilters,
  RefundDiscrepancyStatus,
} from '@/services/api/refundDiscrepancies.api'
import { formatDate, formatCurrency } from '@/utils/format'

export interface RefundDiscrepancyTableProps {
  discrepancies?: RefundDiscrepancy[]
  isLoading?: boolean
  error?: any
  filters?: RefundDiscrepancyFilters
  onFilterChange?: (filters: RefundDiscrepancyFilters) => void
  onReconcile?: (id: string, status: RefundDiscrepancyStatus, notes?: string) => void
  onViewDetails?: (discrepancy: RefundDiscrepancy) => void
}

export const RefundDiscrepancyTable: React.FC<RefundDiscrepancyTableProps> = ({
  discrepancies = [],
  isLoading,
  error,
  filters,
  onFilterChange,
  onReconcile,
  onViewDetails,
}) => {
  const [selected, setSelected] = useState<RefundDiscrepancy | null>(null)
  const [notes, setNotes] = useState('')
  const [nextStatus, setNextStatus] = useState<RefundDiscrepancyStatus>('reconciled')

  const openResolve = (discrepancy: RefundDiscrepancy, status: RefundDiscrepancyStatus) => {
    setSelected(discrepancy)
    setNotes('')
    setNextStatus(status)
  }

  const confirmResolve = () => {
    if (!selected) return
    onReconcile?.(selected.id, nextStatus, notes)
    setSelected(null)
    setNotes('')
  }

  const statusBadge = (status: RefundDiscrepancyStatus) => {
    const variants: Record<RefundDiscrepancyStatus, 'success' | 'warning' | 'secondary'> = {
      pending: 'warning',
      reconciled: 'success',
      ignored: 'secondary',
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refund Discrepancies</CardTitle>
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
          <CardTitle>Refund Discrepancies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load discrepancies.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Refund Discrepancies</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filters?.status || 'all'}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    status: e.target.value === 'all' ? undefined : (e.target.value as RefundDiscrepancyStatus),
                  })
                }
                className="text-sm border border-border rounded px-2 py-1"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
                <option value="ignored">Ignored</option>
              </select>
              <input
                className="text-sm border border-border rounded px-2 py-1"
                placeholder="Reason code"
                value={filters?.refundReasonCode || ''}
                onChange={(e) =>
                  onFilterChange?.({
                    ...filters,
                    refundReasonCode: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {discrepancies.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">No discrepancies found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Refund Qty</TableHead>
                  <TableHead>Returned Qty</TableHead>
                  <TableHead>Unreimbursed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.marketplace?.name || d.marketplaceId}</TableCell>
                    <TableCell className="font-medium">{d.product?.title || 'Unknown'}</TableCell>
                    <TableCell>{d.sku || d.product?.sku || '-'}</TableCell>
                    <TableCell>{d.refundQuantity}</TableCell>
                    <TableCell>{d.returnedQuantity}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(d.unreimbursedAmount)}</TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell>{formatDate(d.detectedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {d.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openResolve(d, 'reconciled')}>
                              Reconcile
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openResolve(d, 'ignored')}>
                              Ignore
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onViewDetails?.(d)}>
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

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {nextStatus === 'reconciled' ? 'Reconcile Discrepancy' : 'Ignore Discrepancy'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add notes about this resolution..."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmResolve}>
                  {nextStatus === 'reconciled' ? 'Reconcile' : 'Ignore'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

