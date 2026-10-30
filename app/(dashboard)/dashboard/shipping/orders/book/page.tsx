import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { BookOrderScreen } from '@/features/shipping/orders/BookOrderScreen'

export const metadata: Metadata = {
  title: 'Book order | Beddora',
  description: 'Rate and book a channel order',
}

/**
 * Book Order Page
 *
 * Rates › Booking for one channel order (`?channel=&market=&orderId=`).
 */
export default function BookOrderPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <Suspense>
        <BookOrderScreen />
      </Suspense>
    </Container>
  )
}
