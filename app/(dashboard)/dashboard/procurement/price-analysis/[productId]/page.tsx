import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PriceAnalysisScreen } from '@/features/procurement/price-analysis'

export const metadata: Metadata = {
  title: 'Price Analysis | Beddora',
}

export default function PriceAnalysisProductPage({ params }: { params: { productId: string } }) {
  const productId = Number(params.productId)
  if (!Number.isInteger(productId) || productId <= 0) notFound()
  return <PriceAnalysisScreen productId={productId} />
}
