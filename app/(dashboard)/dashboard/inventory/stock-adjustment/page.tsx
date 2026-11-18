import { Metadata } from 'next'
import { StockCountScreen } from '@/features/inventory/stock-count'

export const metadata: Metadata = {
  title: 'Stock Adjustment | Beddora',
  description: 'Correct warehouse quantities after a physical count, for today or a past day',
}

export default function StockAdjustmentPage() {
  return <StockCountScreen />
}
