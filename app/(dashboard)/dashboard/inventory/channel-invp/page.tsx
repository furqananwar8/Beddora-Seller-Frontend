import { Metadata } from 'next'
import { ChannelInvpScreen } from '@/features/inventory/channel-invp/ChannelInvpScreen'

export const metadata: Metadata = {
  title: 'Channel INVP | Beddora',
  description: 'Stock per SKU in our warehouse, in containers and at each channel, with daily sales',
}

export default function ChannelInvpPage() {
  return <ChannelInvpScreen />
}
