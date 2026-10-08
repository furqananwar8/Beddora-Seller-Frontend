import { Metadata } from 'next'
import { CostCenterListScreen } from '@/features/finance/cost-centers'

export const metadata: Metadata = {
  title: 'Cost Center | Beddora',
  description: 'Cost centers and their L1 to L4 hierarchy',
}

export default function CostCenterPage() {
  return <CostCenterListScreen />
}
