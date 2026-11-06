import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReceivingFormScreen } from '@/features/inventory/inbound-receiving/ReceivingFormScreen'

export const metadata: Metadata = {
  title: 'Receive container | Beddora',
}

export default function ReceiveContainerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return <ReceivingFormScreen containerId={id} />
}
