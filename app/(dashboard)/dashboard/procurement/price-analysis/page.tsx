import { Suspense } from 'react'
import { Metadata } from 'next'
import { PriceAnalysesScreen } from '@/features/procurement/price-analysis'

export const metadata: Metadata = {
  title: 'Price Analysis | Beddora',
  description: 'Compare supplier quotes per product variant and approve one supplier',
}

export default function PriceAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <PriceAnalysesScreen />
    </Suspense>
  )
}
