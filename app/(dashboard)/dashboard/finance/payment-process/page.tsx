import { Suspense } from 'react'
import { Metadata } from 'next'
import { PaymentProcessScreen } from '@/features/finance/payment-process'

export const metadata: Metadata = {
  title: 'Payment Process | Beddora',
  description: 'Approved requests awaiting payment',
}

export default function PaymentProcessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentProcessScreen />
    </Suspense>
  )
}
