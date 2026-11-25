'use client'

import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs } from '@/design-system/tabs'
import { OrdersScreen } from './OrdersScreen'
import { OverviewTab } from './overview/OverviewTab'

type Tab = 'overview' | 'orders'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
]
/** An address that carries a list filter or an open booking is for the list. */
const LIST_PARAMS = ['search', 'shipment', 'states', 'channels', 'countries', 'from', 'to']

/**
 * Shipping › Orders: the Overview (what to do next, and the numbers) and the Orders list. The tab is in the address
 * (`?tab=`), so a link, a refresh and Back all land where they were; with no tab, an address carrying a list filter
 * opens the list and any other opens the Overview.
 */
export const OrdersPage: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const picked = params.get('tab')
  const tab: Tab = picked === 'orders' || picked === 'overview' ? picked : LIST_PARAMS.some((key) => params.has(key)) ? 'orders' : 'overview'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Orders</h1>
      <Tabs items={TABS} activeTab={tab} onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} />
      {tab === 'overview' ? <OverviewTab /> : <OrdersScreen />}
    </div>
  )
}
