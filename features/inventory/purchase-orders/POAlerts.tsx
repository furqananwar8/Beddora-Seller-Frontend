'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { POAlertsResponse } from '@/types/purchaseOrders.types'
import { formatDate } from '@/utils/format'

export interface POAlertsProps {
  data?: POAlertsResponse
  isLoading?: boolean
  error?: any
}

export const POAlerts: React.FC<POAlertsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PO Alerts</CardTitle>
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
          <CardTitle>PO Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load PO alerts.</div>
        </CardContent>
      </Card>
    )
  }

  const delayed = data?.delayed || []
  const upcoming = data?.upcoming || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>PO Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {delayed.length === 0 && upcoming.length === 0 && (
          <div className="text-text-muted text-sm">No PO alerts.</div>
        )}

        {delayed.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Delayed</div>
            {delayed.map((po) => (
              <div key={po.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium">{po.poNumber}</div>
                  <div className="text-xs text-text-muted">
                    ETA: {po.estimatedDeliveryDate ? formatDate(po.estimatedDeliveryDate) : '—'}
                  </div>
                </div>
                <Badge variant="error" size="sm">
                  Delayed
                </Badge>
              </div>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Upcoming</div>
            {upcoming.map((po) => (
              <div key={po.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium">{po.poNumber}</div>
                  <div className="text-xs text-text-muted">
                    ETA: {po.estimatedDeliveryDate ? formatDate(po.estimatedDeliveryDate) : '—'}
                  </div>
                </div>
                <Badge variant="warning" size="sm">
                  Upcoming
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

