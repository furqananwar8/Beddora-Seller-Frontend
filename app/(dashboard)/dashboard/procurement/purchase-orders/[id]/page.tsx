import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PoFormScreen } from '@/features/procurement/purchase-orders'

export const metadata: Metadata = {
  title: 'Purchase order | Beddora',
}

export default function PurchaseOrderPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return (
    <Suspense fallback={null}>
      <PoFormScreen purchaseOrderId={id} />
    </Suspense>
  )
}
