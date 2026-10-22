import { Metadata } from 'next'
import { ChannelInventoryScreen } from '@/features/inventory/channel-stock'

export const metadata: Metadata = {
  title: 'Channel Inventory (IP) | Beddora',
  description: 'Stock each sales channel reports, per marketplace',
}

export default function ChannelInventoryPage() {
  return <ChannelInventoryScreen />
}
