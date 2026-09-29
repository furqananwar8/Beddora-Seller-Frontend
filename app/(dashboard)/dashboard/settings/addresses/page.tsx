import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { AddressBook } from '@/features/inventory/shipments'

export const metadata: Metadata = {
  title: 'Addresses | Beddora',
  description: 'Addresses your FBA shipments leave from',
}

/**
 * Addresses Page
 *
 * The address book used when creating FBA shipments.
 */
export default function AddressesPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Addresses" description="Warehouses and suppliers your FBA shipments leave from" />
      <AddressBook />
    </div>
  )
}
