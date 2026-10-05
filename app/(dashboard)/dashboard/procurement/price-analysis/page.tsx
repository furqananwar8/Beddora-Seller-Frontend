import { Suspense } from 'react'
import { Metadata } from 'next'
import { PriceAnalysisScreen } from '@/features/procurement/price-analysis'

export const metadata: Metadata = {
  title: 'Price Analysis | Beddora',
  description: 'Compare supplier quotes per product variant',
}

export default function PriceAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <PriceAnalysisScreen />
    </Suspense>
  )
}
