'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { RefundDiscrepancyResponse } from '@/services/api/refundDiscrepancies.api'
import { formatCurrency } from '@/utils/format'

export interface RefundDiscrepancyCardProps {
  data?: RefundDiscrepancyResponse
  isLoading?: boolean
  error?: any
  onViewAll?: () => void
}

export const RefundDiscrepancyCard: React.FC<RefundDiscrepancyCardProps> = ({
  data,
  isLoading,
  error,
  onViewAll,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refund Discrepancies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-surface rounded w-3/4"></div>
            <div className="h-4 bg-surface rounded w-1/2"></div>
          </div>
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

  if (!data || data.discrepancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refund Discrepancies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No refund discrepancies.</div>
        </CardContent>
      </Card>
    )
  }

  const { summary, discrepancies } = data
  const pending = discrepancies.filter((d) => d.status === 'pending').slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Refund Discrepancies</CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Pending</div>
            <div className="text-xl font-bold text-warning-600">{summary.totalPending}</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Reconciled</div>
            <div className="text-xl font-bold text-success-600">{summary.totalReconciled}</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Ignored</div>
            <div className="text-xl font-bold text-secondary-600">{summary.totalIgnored}</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Unreimbursed</div>
            <div className="text-lg font-bold text-text-primary">
              {formatCurrency(summary.totalUnreimbursedAmount)}
            </div>
          </div>
        </div>

        {pending.length > 0 && (
          <div>
            <div className="text-sm font-medium text-text-primary mb-3">Latest Pending</div>
            <div className="space-y-2">
              {pending.map((d) => (
                <div key={d.id} className="bg-surface rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">pending</Badge>
                      <span className="text-sm font-medium">
                        {d.product?.title || d.sku || 'Unknown Product'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-text-primary">
                      {formatCurrency(d.unreimbursedAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {d.marketplace?.name} • Refund qty {d.refundQuantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

