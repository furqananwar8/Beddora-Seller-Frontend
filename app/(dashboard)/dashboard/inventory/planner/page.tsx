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
export default function InventoryPlannerPage({ searchParams }: { searchParams?: { search?: string | string[] } }) {
  // ?search= opens the planner already filtered (e.g. from a product in a shipment)
  const search = Array.isArray(searchParams?.search) ? searchParams?.search[0] : searchParams?.search
  return <InventoryPlannerScreen initialSearch={search} />
}
