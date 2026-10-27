import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { WarehousesScreen } from '@/features/settings/warehouses/WarehousesScreen'

export const metadata: Metadata = {
  title: 'Warehouses | Beddora',
  description: 'Your own warehouse locations',
}

/**
 * Warehouses Page
 *
 * Add, edit and delete the organisation's own warehouse locations.
 */
export default function WarehousesSettingsPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Warehouses" description="Your own warehouse locations" />
      <WarehousesScreen />
    </div>
  )
}
