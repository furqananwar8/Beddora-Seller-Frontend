'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { useGetShipmentSummaryQuery } from '@/services/api/shipping.api'
import { money } from '../shippingMeta'

/** In transit, not scanned yet, exceptions and this month's spend. */
export const ShipmentSummaryCards: React.FC = () => {
  const { data } = useGetShipmentSummaryQuery()
  const value = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('en-CA'))
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="In transit" value={value(data?.inTransit)} />
      <KpiCard title="Label created, not scanned" value={value(data?.notScanned)} subtitle={data?.notScannedStale ? `${data.notScannedStale} over 5 days: void before the refund window closes` : undefined} />
      <KpiCard title="Exceptions" value={value(data?.exceptions)} />
      <KpiCard title="Spend · this month" value={data ? money(data.spendThisMonth, data.currency) : '—'} />
    </div>
  )
}
