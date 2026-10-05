import { Suspense } from 'react'
import { Metadata } from 'next'
import { ContainersScreen } from '@/features/procurement/containers'

export const metadata: Metadata = {
  title: 'Containers | Beddora',
  description: 'Shipping containers, one packaging list each',
}

export default function ContainersPage() {
  return (
    <Suspense fallback={null}>
      <ContainersScreen />
    </Suspense>
  )
}
