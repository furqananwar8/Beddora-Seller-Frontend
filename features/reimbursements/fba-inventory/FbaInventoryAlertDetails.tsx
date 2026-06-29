'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { FbaInventoryAlert, FbaAlertStatus } from '@/services/api/fbaInventory.api'
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/format'

export interface FbaInventoryAlertDetailsProps {
  alert: FbaInventoryAlert
  onResolve?: (alertId: string, status: FbaAlertStatus, notes?: string) => void
  onClose?: () => void
}

export const FbaInventoryAlertDetails: React.FC<FbaInventoryAlertDetailsProps> = ({
  alert,
  onResolve,
  onClose,
}) => {
  const [resolveNotes, setResolveNotes] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resolveStatus, setResolveStatus] = useState<FbaAlertStatus | null>(null)

  const handleResolve = (status: FbaAlertStatus) => {
    setResolveStatus(status)
    setShowResolveForm(true)
  }

  const confirmResolve = () => {
    if (resolveStatus) {
      onResolve?.(alert.id, resolveStatus, resolveNotes)
      setShowResolveForm(false)
      setResolveStatus(null)
      setResolveNotes('')
    }
  }

  const getAlertTypeBadge = () => {
    return (
      <Badge variant={alert.alertType === 'lost' ? 'error' : 'warning'}>
        {alert.alertType.charAt(0).toUpperCase() + alert.alertType.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = () => {
    const variants: Record<FbaAlertStatus, 'success' | 'warning' | 'error' | 'secondary'> = {
      pending: 'warning',
      reimbursed: 'success',
      ignored: 'secondary',
      disputed: 'error',
    }
    return <Badge variant={variants[alert.status]}>{alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>FBA Inventory Alert Details</CardTitle>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Alert Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-text-muted mb-1">Alert Type</div>
              <div>{getAlertTypeBadge()}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Status</div>
              <div>{getStatusBadge()}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Marketplace</div>
              <div className="font-medium">{alert.marketplace?.name || alert.marketplaceId}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Detected At</div>
              <div className="font-medium">{formatDate(alert.detectedAt)}</div>
            </div>
          </div>

          {/* Product Info */}
          {alert.product && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-3">Product Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-text-muted mb-1">Product Title</div>
                  <div className="font-medium">{alert.product.title}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">SKU</div>
                  <div className="font-medium">{alert.product.sku}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">Cost per Unit</div>
                  <div className="font-medium">{formatCurrency(alert.product.cost)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Info */}
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Quantity Information</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Reported Quantity</div>
                <div className="text-2xl font-bold text-text-primary">{alert.reportedQuantity}</div>
              </div>
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Reimbursed Quantity</div>
                <div className="text-2xl font-bold text-success-600">{alert.reimbursedQuantity}</div>
              </div>
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Unreimbursed</div>
                <div className="text-2xl font-bold text-warning-600">
                  {alert.reportedQuantity - alert.reimbursedQuantity}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Financial Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm text-text-muted mb-1">Estimated Reimbursement Amount</div>
                <div className="text-2xl font-bold text-primary-600">
                  {formatCurrency(alert.estimatedAmount)}
                </div>
              </div>
              {alert.reimbursedQuantity > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <div className="text-sm text-text-muted mb-1">Reimbursed Amount</div>
                  <div className="text-2xl font-bold text-success-600">
                    {formatCurrency(
                      (alert.estimatedAmount / alert.reportedQuantity) * alert.reimbursedQuantity
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {alert.notes && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-2">Notes</div>
              <div className="bg-surface rounded-lg p-3 text-sm">{alert.notes}</div>
            </div>
          )}

          {/* Resolution Info */}
          {alert.resolvedAt && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-2">Resolution</div>
              <div className="text-sm text-text-muted">Resolved at: {formatDate(alert.resolvedAt)}</div>
            </div>
          )}

          {/* Actions */}
          {alert.status === 'pending' && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium text-text-primary mb-3">Actions</div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => handleResolve('reimbursed')}>
                  Mark as Reimbursed
                </Button>
                <Button variant="outline" onClick={() => handleResolve('ignored')}>
                  Ignore
                </Button>
                <Button variant="outline" onClick={() => handleResolve('disputed')}>
                  Dispute
                </Button>
              </div>
            </div>
          )}

          {/* Resolve Form Modal */}
          {showResolveForm && resolveStatus && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">
                  {resolveStatus === 'reimbursed'
                    ? 'Mark as Reimbursed'
                    : resolveStatus === 'ignored'
                    ? 'Ignore Alert'
                    : 'Dispute Alert'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <textarea
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
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
                      {resolveStatus === 'reimbursed'
                        ? 'Mark Reimbursed'
                        : resolveStatus === 'ignored'
                        ? 'Ignore'
                        : 'Dispute'}
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

