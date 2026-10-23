import { Suspense } from 'react'
import { Metadata } from 'next'
import { CostAnalysisScreen } from '@/features/procurement/containers'

export const metadata: Metadata = {
  title: 'Cost Analysis | Beddora',
  description: 'Landed cost per SKU of each container',
}

export default function CostAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <CostAnalysisScreen />
    </Suspense>
  )
}
