import { Metadata } from 'next'
import { FBAShipmentsScreen } from '@/features/inventory/FBAShipmentsScreen'

export const metadata: Metadata = {
  title: 'FBA Shipments | Beddora',
  description: 'Manage your Amazon FBA inbound shipments and track delivery status',
}

/**
 * FBA Shipments Page
 * 
 * Main page for FBA shipment management
 */
export default function FBAShipmentsPage() {
  return <FBAShipmentsScreen />
}
