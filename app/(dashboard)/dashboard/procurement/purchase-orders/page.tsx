import { Suspense } from 'react'
import { Metadata } from 'next'
import { PurchaseOrdersScreen } from '@/features/procurement/purchase-orders'

export const metadata: Metadata = {
  title: 'Purchase Orders | Beddora',
  description: 'Purchase orders, approvals and ETD tracking',
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrdersScreen />
    </Suspense>
  )
}
