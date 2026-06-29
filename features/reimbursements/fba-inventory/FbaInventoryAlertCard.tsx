'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { FbaInventoryAlertResponse } from '@/services/api/fbaInventory.api'
import { formatCurrency } from '@/utils/format'

export interface FbaInventoryAlertCardProps {
  data?: FbaInventoryAlertResponse
  isLoading?: boolean
  error?: any
  onViewAll?: () => void
}

export const FbaInventoryAlertCard: React.FC<FbaInventoryAlertCardProps> = ({
  data,
  isLoading,
  error,
  onViewAll,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FBA Inventory Alerts</CardTitle>
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
          <CardTitle>FBA Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load alerts.</div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FBA Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No FBA inventory alerts.</div>
        </CardContent>
      </Card>
    )
  }

  const { summary, alerts } = data
  const pendingAlerts = alerts.filter((a) => a.status === 'pending').slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>FBA Inventory Alerts</CardTitle>
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
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Pending</div>
            <div className="text-xl font-bold text-warning-600">{summary.totalPending}</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Reimbursed</div>
            <div className="text-xl font-bold text-success-600">{summary.totalReimbursed}</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Estimated</div>
            <div className="text-lg font-bold text-text-primary">
              {formatCurrency(summary.totalEstimatedAmount)}
            </div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Reimbursed</div>
            <div className="text-lg font-bold text-success-600">
              {formatCurrency(summary.totalReimbursedAmount)}
            </div>
          </div>
        </div>

        {/* Latest Alerts */}
        {pendingAlerts.length > 0 && (
          <div>
            <div className="text-sm font-medium text-text-primary mb-3">Latest Pending Alerts</div>
            <div className="space-y-2">
              {pendingAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-surface rounded-lg p-3 border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.alertType === 'lost' ? 'error' : 'warning'}>
                        {alert.alertType}
                      </Badge>
                      <span className="text-sm font-medium">
                        {alert.product?.title || alert.sku || 'Unknown Product'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-text-primary">
                      {formatCurrency(alert.estimatedAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {alert.marketplace?.name} • {alert.reportedQuantity} units
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

