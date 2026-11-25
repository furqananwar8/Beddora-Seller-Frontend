'use client'

import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs } from '@/design-system/tabs'
import { useAppAbility } from '@/hooks/useAppAbility'
import { CreateShipmentScreen } from '../create/CreateShipmentScreen'
import { MANUAL_SHIPMENT_FLOW } from '../shippingFlags'
import { OrdersScreen } from './OrdersScreen'

type Tab = 'shipment' | 'orders'

/**
 * Shipping › Orders: the Shipment tab (create a manual shipment) and the Orders list. The tab is in the address
 * (`?tab=`), so a link, a refresh and Back all land where they were; `?draft=` opens Shipment, anything else Orders.
 */
export const OrdersPage: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const ability = useAppAbility()
  const canCreate = MANUAL_SHIPMENT_FLOW && ability.can('write', 'shipping:orders')
  const wanted = params.get('tab') ?? (params.has('draft') ? 'shipment' : 'orders')
  const tab: Tab = wanted === 'shipment' && canCreate ? 'shipment' : 'orders'
  const items = [...(canCreate ? [{ id: 'shipment', label: 'Shipment' }] : []), { id: 'orders', label: 'Orders' }]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Orders</h1>
      <Tabs items={items} activeTab={tab} onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} />
      {tab === 'shipment' ? <CreateShipmentScreen /> : <OrdersScreen />}
    </div>
  )
}
