'use client'

import { useParams } from 'next/navigation'
import { ScanSessionScreen } from '@/features/barcode/session/ScanSessionScreen'

export default function ScanSessionPage() {
  const { id } = useParams<{ id: string }>()
  return <ScanSessionScreen sessionId={Number(id)} />
}
