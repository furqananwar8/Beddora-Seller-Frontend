import { Suspense } from 'react'
import { Metadata } from 'next'
import { PaymentRequestScreen } from '@/features/finance/payment-requests'

export const metadata: Metadata = {
  title: 'Payment Requests | Beddora',
  description: 'Review, approve and track payment requests',
}

export default function PaymentRequestPage() {
  return (
    <Suspense fallback={null}>
      <PaymentRequestScreen />
    </Suspense>
  )
}
