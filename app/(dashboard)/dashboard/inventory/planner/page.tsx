import { Metadata } from 'next'
import { InventoryPlannerScreen } from '@/features/inventory'

export const metadata: Metadata = {
  title: 'Inventory Planner | Beddora',
  description: 'Plan and manage your inventory levels, reorders, and shipments',
}

/**
 * Inventory Planner Page
 * 
 * Main page for inventory planning and management
 */
export default function InventoryPlannerPage() {
  return <InventoryPlannerScreen />
}
