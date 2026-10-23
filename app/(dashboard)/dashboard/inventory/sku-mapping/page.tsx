import { Metadata } from 'next'
import { SkuMappingScreen } from '@/features/inventory/sku-mapping'

export const metadata: Metadata = {
  title: 'SKU Mapping | Beddora',
  description: 'Bind channel listings to internal SKUs with a quantity per unit sold',
}

export default function SkuMappingPage() {
  return <SkuMappingScreen />
}
