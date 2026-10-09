import { Suspense } from 'react'
import { Metadata } from 'next'
import { CostCenterCreateScreen } from '@/features/finance/cost-centers'

export const metadata: Metadata = {
  title: 'New Cost Center | Beddora',
  description: 'Create cost centers and their hierarchy',
}

export default function NewCostCenterPage() {
  // The screen reads `returnTo` from the query string, which needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <CostCenterCreateScreen />
    </Suspense>
  )
}
