import { redirect } from 'next/navigation'
import { ORDERS_HREF } from '@/features/shipping/shippingMeta'

/**
 * Shipping › Bookings now lives in Orders (manual shipments, drafts and bookings share one list). This keeps old links
 * and bookmarks working, including `?shipment=` (the booking's drawer).
 */
export default function ShippingBookingsRedirect({ searchParams }: { searchParams: { shipment?: string } }) {
  const shipment = Number(searchParams.shipment)
  redirect(Number.isInteger(shipment) && shipment > 0 ? `${ORDERS_HREF}?shipment=${shipment}` : ORDERS_HREF)
}
