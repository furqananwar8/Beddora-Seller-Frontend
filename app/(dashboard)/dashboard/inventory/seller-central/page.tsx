import { Metadata } from 'next'
import { SellerCentralScreen } from '@/features/inventory/seller-central'

export const metadata: Metadata = {
  title: 'Seller Central Shipments | Beddora',
  description: 'Shipments created in Seller Central, synced from Amazon',
}

export default function InventorySellerCentralPage() {
  return <SellerCentralScreen />
}
