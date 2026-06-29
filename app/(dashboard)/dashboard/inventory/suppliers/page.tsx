import { Metadata } from 'next'
import { SuppliersScreen } from '@/features/inventory/SuppliersScreen'

export const metadata: Metadata = {
  title: 'Suppliers | Beddora',
  description: 'Manage your suppliers and vendor information',
}

/**
 * Suppliers Page
 * 
 * Main page for supplier management
 */
export default function SuppliersPage() {
  return <SuppliersScreen />
}
