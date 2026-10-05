import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PackagingListFormScreen } from '@/features/procurement/packaging-lists'

export const metadata: Metadata = {
  title: 'Packaging list | Beddora',
}

export default function PackagingListPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return (
    <Suspense fallback={null}>
      <PackagingListFormScreen packagingListId={id} />
    </Suspense>
  )
}
