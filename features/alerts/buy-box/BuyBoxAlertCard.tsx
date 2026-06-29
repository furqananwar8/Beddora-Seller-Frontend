'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { BuyBoxAlertItem } from '@/types/buyBoxAlerts.types'

export interface BuyBoxAlertCardProps {
  items?: BuyBoxAlertItem[]
}

export const BuyBoxAlertCard: React.FC<BuyBoxAlertCardProps> = ({ items }) => {
  const total = items?.length || 0
  const unread = items?.filter((item) => item.status === 'unread').length || 0
  const lostBuyBox = items?.filter((item) => item.lostBuyBox).length || 0
  const resolved = items?.filter((item) => item.status === 'resolved').length || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Alerts" value={total} />
      <KpiCard title="Unread" value={unread} />
      <KpiCard title="Lost Buy Box" value={lostBuyBox} />
      <KpiCard title="Resolved" value={resolved} />
    </div>
  )
}

