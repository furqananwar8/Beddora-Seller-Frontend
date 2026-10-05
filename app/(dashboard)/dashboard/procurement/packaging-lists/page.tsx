import { Suspense } from 'react'
import { Metadata } from 'next'
import { PackagingListsScreen } from '@/features/procurement/packaging-lists'

export const metadata: Metadata = {
  title: 'Packaging Lists | Beddora',
  description: 'Units packed from purchase orders, per SKU',
}

export default function PackagingListsPage() {
  return (
    <Suspense fallback={null}>
      <PackagingListsScreen />
    </Suspense>
  )
}
