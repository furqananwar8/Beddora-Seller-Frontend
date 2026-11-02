import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { BookingsScreen } from '@/features/shipping/bookings/BookingsScreen'

export const metadata: Metadata = {
  title: 'Bookings | Beddora',
  description: 'Every parcel shipment from every provider',
}

/**
 * Shipping Bookings Page
 *
 * Every booked parcel with its live status; print, track and cancel. Suspense: the screen reads `?shipment=`.
 */
export default function ShippingBookingsPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <Suspense>
        <BookingsScreen />
      </Suspense>
    </Container>
  )
}
