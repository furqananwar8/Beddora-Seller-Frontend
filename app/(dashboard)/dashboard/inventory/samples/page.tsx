import { Metadata } from 'next'
import { SamplesScreen } from '@/features/inventory/samples/SamplesScreen'

export const metadata: Metadata = {
  title: 'Samples | Beddora',
  description: 'Samples suppliers send with purchase orders, per SKU',
}

export default function SamplesPage() {
  return <SamplesScreen />
}
