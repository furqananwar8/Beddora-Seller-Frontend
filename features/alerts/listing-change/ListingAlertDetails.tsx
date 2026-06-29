'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ListingAlertItem } from '@/types/listingAlerts.types'

export interface ListingAlertDetailsProps {
  alert?: ListingAlertItem | null
}

export const ListingAlertDetails: React.FC<ListingAlertDetailsProps> = ({ alert }) => {
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
            <div className="text-text-muted">Previous Title</div>
            <div className="font-medium">{alert.previousTitle || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Title</div>
            <div className="font-medium">{alert.newTitle || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">Previous Description</div>
            <div>{alert.previousDescription || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Description</div>
            <div>{alert.newDescription || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">Previous Category</div>
            <div>{alert.previousCategory || '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Category</div>
            <div>{alert.newCategory || '—'}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-text-muted">Previous Images</div>
            <div>{alert.previousImages ? JSON.stringify(alert.previousImages) : '—'}</div>
          </div>
          <div>
            <div className="text-text-muted">New Images</div>
            <div>{alert.newImages ? JSON.stringify(alert.newImages) : '—'}</div>
          </div>
        </div>
        <div>
          <div className="text-text-muted">New Seller Detected</div>
          <div className="font-medium">{alert.newSellerDetected ? 'Yes' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  )
}

