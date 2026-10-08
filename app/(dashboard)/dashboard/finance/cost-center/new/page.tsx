import { Metadata } from 'next'
import { CostCenterCreateScreen } from '@/features/finance/cost-centers'

export const metadata: Metadata = {
  title: 'New Cost Center | Beddora',
  description: 'Create cost centers and their hierarchy',
}

export default function NewCostCenterPage() {
  return <CostCenterCreateScreen />
}
