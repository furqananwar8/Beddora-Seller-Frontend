import { Suspense } from 'react'
import { Metadata } from 'next'
import { PurchaseInvoicesScreen } from '@/features/procurement/purchase-invoices'

export const metadata: Metadata = {
  title: 'Purchase Invoices | Beddora',
  description: 'Invoices raised against purchase orders, their approval, payment and PDF',
}

export default function PurchaseInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseInvoicesScreen />
    </Suspense>
  )
}
