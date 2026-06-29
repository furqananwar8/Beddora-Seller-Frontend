'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { ListingAlertItem } from '@/types/listingAlerts.types'

export interface ListingAlertCardProps {
  items?: ListingAlertItem[]
}

export const ListingAlertCard: React.FC<ListingAlertCardProps> = ({ items }) => {
  const total = items?.length || 0
  const unread = items?.filter((item) => item.status === 'unread').length || 0
  const resolved = items?.filter((item) => item.status === 'resolved').length || 0
  const newSellers = items?.filter((item) => item.newSellerDetected).length || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Alerts" value={total} />
      <KpiCard title="Unread" value={unread} />
      <KpiCard title="Resolved" value={resolved} />
      <KpiCard title="New Sellers" value={newSellers} />
    </div>
  )
}

