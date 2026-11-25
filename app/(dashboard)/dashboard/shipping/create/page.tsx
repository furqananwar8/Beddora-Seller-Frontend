import { redirect } from 'next/navigation'
import { CREATE_HREF } from '@/features/shipping/shippingMeta'

/** Create shipment is now the Shipment tab of Orders; this keeps old links (and `?draft=`) working. */
export default function CreateShipmentRedirect({ searchParams }: { searchParams: { draft?: string } }) {
  const draft = Number(searchParams.draft)
  redirect(Number.isInteger(draft) && draft > 0 ? `${CREATE_HREF}&draft=${draft}` : CREATE_HREF)
}
