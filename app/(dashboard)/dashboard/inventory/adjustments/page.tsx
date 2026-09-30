import { Metadata } from 'next'
import { AdjustmentsScreen } from '@/features/inventory/adjustments'

export const metadata: Metadata = {
  title: 'Adjustments | Beddora',
  description: 'Correct on-hand quantities and box dimensions per SKU',
}

export default function InventoryAdjustmentsPage() {
  return <AdjustmentsScreen />
}
