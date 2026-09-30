import { Suspense } from 'react'
import { Metadata } from 'next'
import { PaymentRequestFormScreen } from '@/features/finance/payment-requests'

export const metadata: Metadata = {
  title: 'New Payment Request | Beddora',
  description: 'Raise a payment request and send it for approval',
}

export default function NewPaymentRequestPage() {
  return (
    <Suspense fallback={null}>
      <PaymentRequestFormScreen />
    </Suspense>
  )
}
