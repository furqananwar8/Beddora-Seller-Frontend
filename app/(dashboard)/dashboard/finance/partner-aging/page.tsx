import { Metadata } from 'next'
import { PartnerAgingScreen } from '@/features/finance/partner-aging'

export const metadata: Metadata = {
  title: 'Partner Aging Report | Beddora',
  description: 'Open payments per partner by due date',
}

export default function PartnerAgingPage() {
  return <PartnerAgingScreen />
}
