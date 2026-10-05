import { Suspense } from 'react'
import { Metadata } from 'next'
import { ProductFormScreen } from '@/features/procurement/products'

export const metadata: Metadata = {
  title: 'New product | Beddora',
}

export default function NewProcurementProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductFormScreen />
    </Suspense>
  )
}
