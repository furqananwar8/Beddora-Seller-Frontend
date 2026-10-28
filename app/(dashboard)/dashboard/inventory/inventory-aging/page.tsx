import { Metadata } from 'next'
import { InventoryAgingScreen } from '@/features/inventory/inventory-aging/InventoryAgingScreen'

export const metadata: Metadata = {
  title: 'Inventory Aging | Beddora',
  description: "Units at Amazon by how long they have been in its warehouses, from Amazon's Inventory Age report",
}

export default function InventoryAgingPage() {
  return <InventoryAgingScreen />
}
