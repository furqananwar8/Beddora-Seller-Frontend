import { Metadata } from 'next'
import { PartnerFormScreen } from '@/features/finance/partners'

export const metadata: Metadata = {
  title: 'New partner | Beddora',
  description: 'Create a vendor or supplier profile',
}

export default function NewPartnerPage() {
  return <PartnerFormScreen mode="create" />
}
