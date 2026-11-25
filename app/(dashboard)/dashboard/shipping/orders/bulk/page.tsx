import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { BulkBookScreen } from '@/features/shipping/orders/bulk/BulkBookScreen'

export const metadata: Metadata = {
  title: 'Book orders | Beddora',
  description: 'Rate and book several channel orders at once',
}

/**
 * Bulk Book Page
 *
 * Review, Rates, Confirm and Booking for the To Book orders ticked in the Orders list.
 */
export default function BulkBookPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <Suspense>
        <BulkBookScreen />
      </Suspense>
    </Container>
  )
}
