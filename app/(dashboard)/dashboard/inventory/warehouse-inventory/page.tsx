import { Metadata } from 'next'
import { WarehouseInventoryScreen } from '@/features/inventory/warehouse-inventory/WarehouseInventoryScreen'

export const metadata: Metadata = {
  title: 'Warehouse Inventory | Beddora',
  description: 'Stock per SKU at Amazon, in our warehouses and in containers, at landed cost',
}

export default function WarehouseInventoryPage() {
  return <WarehouseInventoryScreen />
}
