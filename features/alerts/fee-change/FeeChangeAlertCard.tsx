'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { FeeChangeAlertItem } from '@/types/feeChangeAlerts.types'

export interface FeeChangeAlertCardProps {
  items?: FeeChangeAlertItem[]
}

export const FeeChangeAlertCard: React.FC<FeeChangeAlertCardProps> = ({ items }) => {
  const total = items?.length || 0
  const unread = items?.filter((item) => item.status === 'unread').length || 0
  const resolved = items?.filter((item) => item.status === 'resolved').length || 0
  const largeChanges =
    items?.filter((item) => (item.changePercentage || 0) >= 10).length || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Alerts" value={total} />
      <KpiCard title="Unread" value={unread} />
      <KpiCard title="Large Changes" value={largeChanges} />
      <KpiCard title="Resolved" value={resolved} />
    </div>
  )
}

