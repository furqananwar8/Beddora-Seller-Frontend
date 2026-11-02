import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { CreateShipmentScreen } from '@/features/shipping/create/CreateShipmentScreen'

export const metadata: Metadata = {
  title: 'Create shipment | Beddora',
  description: 'Rate and book a parcel with Stallion, Shippo or UniUni',
}

/**
 * Create Shipment Page
 *
 * Address, parcel and customs, live rates from every provider, then book and print the label.
 */
export default function CreateShipmentPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <CreateShipmentScreen />
    </Container>
  )
}
