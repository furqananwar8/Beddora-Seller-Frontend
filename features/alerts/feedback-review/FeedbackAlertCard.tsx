'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { FeedbackAlertItem } from '@/types/feedbackAlerts.types'

export interface FeedbackAlertCardProps {
  items?: FeedbackAlertItem[]
}

export const FeedbackAlertCard: React.FC<FeedbackAlertCardProps> = ({ items }) => {
  const total = items?.length || 0
  const unread = items?.filter((item) => item.status === 'unread').length || 0
  const lowRatings =
    items?.filter((item) => (item.newRating || 0) <= 3).length || 0
  const resolved = items?.filter((item) => item.status === 'resolved').length || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Alerts" value={total} />
      <KpiCard title="Unread" value={unread} />
      <KpiCard title="Low Ratings" value={lowRatings} />
      <KpiCard title="Resolved" value={resolved} />
    </div>
  )
}

