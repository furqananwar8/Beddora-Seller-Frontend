import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { OrdersPage } from '@/features/shipping/orders/OrdersPage'

export const metadata: Metadata = {
  title: 'Orders | Beddora',
  description: 'Channel orders to book with our carriers, and orders shipped on the channel',
}

/**
 * Shipping Orders Page
 *
 * The Overview and the list of seller-fulfilled channel orders. Suspense: the screen reads `?tab=` and the list's filters.
 */
export default function ShippingOrdersPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <Suspense>
        <OrdersPage />
      </Suspense>
    </Container>
  )
}
