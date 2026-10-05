import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductFormScreen } from '@/features/procurement/products'

export const metadata: Metadata = {
  title: 'Product | Beddora',
}

export default function ProcurementProductPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return (
    <Suspense fallback={null}>
      <ProductFormScreen productId={id} />
    </Suspense>
  )
}
