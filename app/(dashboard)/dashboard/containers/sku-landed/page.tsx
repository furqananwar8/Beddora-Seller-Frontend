import { Metadata } from 'next'
import { SkuLandedScreen } from '@/features/procurement/containers'

export const metadata: Metadata = {
  title: 'SKU Landed | Beddora',
  description: 'Landed and shipment cost per SKU',
}

export default function SkuLandedPage() {
  return <SkuLandedScreen />
}
