import { Suspense } from 'react'
import { Metadata } from 'next'
import { PurchaseInvoiceFormScreen } from '@/features/procurement/purchase-invoices'

export const metadata: Metadata = {
  title: 'Purchase Invoice | Beddora',
  description: 'Raise a purchase invoice from a purchase order and send it for approval',
}

export default function NewPurchaseInvoicePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseInvoiceFormScreen />
    </Suspense>
  )
}
