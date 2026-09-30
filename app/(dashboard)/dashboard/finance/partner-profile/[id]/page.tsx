import { Metadata } from 'next'
import { PartnerFormScreen } from '@/features/finance/partners'

export const metadata: Metadata = {
  title: 'Partner Profile | Beddora',
  description: 'Edit a vendor or supplier profile',
}

export default function EditPartnerPage({ params }: { params: { id: string } }) {
  return <PartnerFormScreen mode="edit" partnerId={Number(params.id)} />
}
