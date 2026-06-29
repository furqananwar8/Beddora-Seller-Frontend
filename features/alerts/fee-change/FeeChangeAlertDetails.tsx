'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { FeeChangeAlertItem } from '@/types/feeChangeAlerts.types'

export interface FeeChangeAlertDetailsProps {
  alert?: FeeChangeAlertItem | null
}

export const FeeChangeAlertDetails: React.FC<FeeChangeAlertDetailsProps> = ({ alert }) => {
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
          <div className="text-text-muted">Fee Type</div>
          <div className="font-medium">{alert.feeType}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-text-muted">Previous Fee</div>
            <div className="font-medium">{alert.previousFee ?? '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Fee</div>
            <div className="font-medium">{alert.newFee ?? '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">Change Percentage</div>
            <div className="font-medium">{alert.changePercentage ?? '—'}%</div>
          </div>
          <div>
            <div className="text-text-muted">SKU</div>
            <div className="font-medium">{alert.sku || '—'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

