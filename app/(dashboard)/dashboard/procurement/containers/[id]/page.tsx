import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ContainerDetailScreen } from '@/features/procurement/containers'

export const metadata: Metadata = {
  title: 'Container | Beddora',
}

export default function ContainerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return <ContainerDetailScreen containerId={id} />
}
