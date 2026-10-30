import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { OrdersScreen } from '@/features/shipping/orders/OrdersScreen'

export const metadata: Metadata = {
  title: 'Orders | Beddora',
  description: 'Channel orders to book with our carriers, and orders shipped on the channel',
}

/**
 * Shipping Orders Page
 *
 * Seller-fulfilled channel orders to book, and orders shipped on the channel. Suspense: the screen reads `?search=`.
 */
export default function ShippingOrdersPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <Suspense>
        <OrdersScreen />
      </Suspense>
    </Container>
  )
}
