import { Metadata } from 'next'
import { InboundReceivingScreen } from '@/features/inventory/inbound-receiving/InboundReceivingScreen'

export const metadata: Metadata = {
  title: 'Inbound Receiving | Beddora',
  description: 'Count, sign and confirm containers delivered at the warehouse',
}

export default function InboundReceivingPage() {
  return <InboundReceivingScreen />
}
