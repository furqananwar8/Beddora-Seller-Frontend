'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { BuyBoxAlertItem } from '@/types/buyBoxAlerts.types'

export interface BuyBoxAlertDetailsProps {
  alert?: BuyBoxAlertItem | null
}

export const BuyBoxAlertDetails: React.FC<BuyBoxAlertDetailsProps> = ({ alert }) => {
  if (!alert) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">Select an alert to view details.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="text-text-muted">ASIN</div>
          <div className="font-medium">{alert.asin}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-text-muted">Previous Price</div>
            <div className="font-medium">{alert.previousPrice ?? '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Price</div>
            <div className="font-medium">{alert.newPrice ?? '—'}</div>
          </div>
        </div>
        <div>
          <div className="text-text-muted">Lost Buy Box</div>
          <div className="font-medium">{alert.lostBuyBox ? 'Yes' : 'No'}</div>
        </div>
        <div>
          <div className="text-text-muted">Competitor Changes</div>
          <div>{alert.competitorChanges ? JSON.stringify(alert.competitorChanges) : '—'}</div>
        </div>
      </CardContent>
    </Card>
  )
}

