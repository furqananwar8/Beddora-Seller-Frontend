import { Suspense } from 'react'
import { Metadata } from 'next'
import { BindingHistoryScreen } from '@/features/inventory/sku-mapping'

export const metadata: Metadata = {
  title: 'Binding History | Beddora',
  description: 'Every version of a channel SKU binding',
}

export default function BindingHistoryPage() {
  return (
    <Suspense fallback={null}>
      <BindingHistoryScreen />
    </Suspense>
  )
}
