'use client'

import { useParams } from 'next/navigation'
import { SessionDetailScreen } from '@/features/barcode/session/SessionDetailScreen'

export default function ScanSessionPage() {
  const { id } = useParams<{ id: string }>()
  return <SessionDetailScreen sessionId={Number(id)} />
}
