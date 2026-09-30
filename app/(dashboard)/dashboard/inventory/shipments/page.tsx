import { Suspense } from 'react'
import { Metadata } from 'next'
import { ShipmentsScreen } from '@/features/inventory/shipments'

export const metadata: Metadata = {
  title: 'Shipments | Beddora',
  description: 'Split FBA reserved stock into Amazon inbound shipments and track them to receipt',
}

/**
 * Inventory Shipments Page
 *
 * FBA inbound shipment creation, editing and tracking.
 * Suspense is required because the screen reads search params (Planner deep link).
 */
export default function InventoryShipmentsPage() {
  return (
    <Suspense>
      <ShipmentsScreen />
    </Suspense>
  )
}
