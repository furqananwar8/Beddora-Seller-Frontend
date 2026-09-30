import { Metadata } from 'next'
import { PartnerListScreen } from '@/features/finance/partners'

export const metadata: Metadata = {
  title: 'Partner Profile | Beddora',
  description: 'Vendors and suppliers with their payment details',
}

export default function PartnerProfilePage() {
  return <PartnerListScreen />
}
