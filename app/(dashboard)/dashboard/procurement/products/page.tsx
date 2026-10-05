import { Suspense } from 'react'
import { Metadata } from 'next'
import { ProductsScreen } from '@/features/procurement/products'

export const metadata: Metadata = {
  title: 'Products | Beddora',
  description: 'Master products and their variations',
}

export default function ProcurementProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsScreen />
    </Suspense>
  )
}
