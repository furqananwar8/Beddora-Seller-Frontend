import { Metadata } from 'next'
import { PurchaseOrdersScreen } from '@/features/inventory/PurchaseOrdersScreen'

export const metadata: Metadata = {
  title: 'Purchase Orders | Beddora',
  description: 'Manage your purchase orders and track inventory shipments',
}

/**
 * Purchase Orders Page
 * 
 * Main page for purchase order management
 */
export default function PurchaseOrdersPage() {
  return <PurchaseOrdersScreen />
}
