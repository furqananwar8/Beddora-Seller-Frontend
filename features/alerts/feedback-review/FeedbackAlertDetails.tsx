'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { FeedbackAlertItem } from '@/types/feedbackAlerts.types'

export interface FeedbackAlertDetailsProps {
  alert?: FeedbackAlertItem | null
}

export const FeedbackAlertDetails: React.FC<FeedbackAlertDetailsProps> = ({ alert }) => {
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
          <div className="font-medium">{alert.asin || '—'}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-text-muted">Previous Rating</div>
            <div className="font-medium">{alert.previousRating ?? '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Rating</div>
            <div className="font-medium">{alert.newRating ?? '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">Reviewer</div>
            <div className="font-medium">{alert.reviewer || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">SKU</div>
            <div className="font-medium">{alert.sku || '—'}</div>
          </div>
        </div>
        <div>
          <div className="text-text-muted">Review Text</div>
          <div>{alert.reviewText || '—'}</div>
        </div>
      </CardContent>
    </Card>
  )
}

