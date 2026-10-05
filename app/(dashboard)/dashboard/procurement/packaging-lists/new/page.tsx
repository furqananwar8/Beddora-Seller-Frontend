import { Suspense } from 'react'
import { Metadata } from 'next'
import { PackagingListFormScreen } from '@/features/procurement/packaging-lists'

export const metadata: Metadata = {
  title: 'New packaging list | Beddora',
}

export default function NewPackagingListPage() {
  return (
    <Suspense fallback={null}>
      <PackagingListFormScreen />
    </Suspense>
  )
}
