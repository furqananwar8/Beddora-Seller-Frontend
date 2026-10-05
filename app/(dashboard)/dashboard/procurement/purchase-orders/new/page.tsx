import { Suspense } from 'react'
import { Metadata } from 'next'
import { PoFormScreen } from '@/features/procurement/purchase-orders'

export const metadata: Metadata = {
  title: 'New purchase order | Beddora',
}

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={null}>
      <PoFormScreen />
    </Suspense>
  )
}
