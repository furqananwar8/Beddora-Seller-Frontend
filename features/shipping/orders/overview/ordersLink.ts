import { ORDERS_HREF } from '../../shippingMeta'
import type { ChannelId, Fulfillment } from '../../types'

export interface OrdersLinkFilters {
  states?: Fulfillment[]
  channels?: ChannelId[]
  countries?: string[]
  /** yyyy-mm-dd */
  from?: string
  to?: string
}

/** The Orders tab opened with these filters, so a figure on the Overview lands on the orders behind it. */
export function ordersLink({ states, channels, countries, from, to }: OrdersLinkFilters): string {
  const params = new URLSearchParams({ tab: 'orders' })
  if (states?.length) params.set('states', states.join(','))
  if (channels?.length) params.set('channels', channels.join(','))
  if (countries?.length) params.set('countries', countries.join(','))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return `${ORDERS_HREF}?${params.toString()}`
}
