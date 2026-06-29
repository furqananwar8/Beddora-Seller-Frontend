'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { RefundDiscrepancy, RefundDiscrepancyStatus } from '@/services/api/refundDiscrepancies.api'
import { formatDate, formatCurrency } from '@/utils/format'

export interface RefundDiscrepancyDetailsProps {
  discrepancy: RefundDiscrepancy
  onReconcile?: (id: string, status: RefundDiscrepancyStatus, notes?: string) => void
  onClose?: () => void
}

export const RefundDiscrepancyDetails: React.FC<RefundDiscrepancyDetailsProps> = ({
  discrepancy,
  onReconcile,
  onClose,
}) => {
  const [notes, setNotes] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [nextStatus, setNextStatus] = useState<RefundDiscrepancyStatus>('reconciled')

  const statusBadge = () => {
    const variants: Record<RefundDiscrepancyStatus, 'success' | 'warning' | 'secondary'> = {
      pending: 'warning',
      reconciled: 'success',
      ignored: 'secondary',
    }
    return <Badge variant={variants[discrepancy.status]}>{discrepancy.status}</Badge>
  }

  const openResolve = (status: RefundDiscrepancyStatus) => {
    setNextStatus(status)
    setShowResolveForm(true)
  }

  const confirmResolve = () => {
    onReconcile?.(discrepancy.id, nextStatus, notes)
    setShowResolveForm(false)
    setNotes('')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Refund Discrepancy Details</CardTitle>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-text-muted mb-1">Status</div>
              <div>{statusBadge()}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Detected At</div>
              <div className="font-medium">{formatDate(discrepancy.detectedAt)}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Marketplace</div>
              <div className="font-medium">{discrepancy.marketplace?.name || discrepancy.marketplaceId}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Reason Code</div>
              <div className="font-medium">{discrepancy.refundReasonCode || '—'}</div>
            </div>
          </div>

          {discrepancy.product && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-3">Product</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-text-muted mb-1">Title</div>
                  <div className="font-medium">{discrepancy.product.title}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">SKU</div>
                  <div className="font-medium">{discrepancy.product.sku}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">Cost</div>
                  <div className="font-medium">{formatCurrency(discrepancy.product.cost)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Quantities</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Refunded</div>
                <div className="text-2xl font-bold text-text-primary">{discrepancy.refundQuantity}</div>
              </div>
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Returned</div>
                <div className="text-2xl font-bold text-success-600">{discrepancy.returnedQuantity}</div>
              </div>
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Discrepancy</div>
                <div className="text-2xl font-bold text-warning-600">
                  {Math.max(discrepancy.refundQuantity - discrepancy.returnedQuantity, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Financial Impact</div>
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-text-muted mb-1">Unreimbursed Amount</div>
              <div className="text-2xl font-bold text-primary-600">
                {formatCurrency(discrepancy.unreimbursedAmount)}
              </div>
            </div>
          </div>

          {discrepancy.status === 'pending' && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-3">Actions</div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => openResolve('reconciled')}>
                  Reconcile
                </Button>
                <Button variant="outline" onClick={() => openResolve('ignored')}>
                  Ignore
                </Button>
              </div>
            </div>
          )}

          {showResolveForm && (
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
                      rows={4}
                      placeholder="Add notes about this resolution..."
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowResolveForm(false)}>
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
        </div>
      </CardContent>
    </Card>
  )
}

