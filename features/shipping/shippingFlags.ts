/**
 * Manual shipments (Create shipment: Sales channel + Address Info › Shipment Info › Rates › Booking), next to booking
 * channel orders. A manual shipment records its platform and marketplace; no channel order is linked or updated.
 */
export const MANUAL_SHIPMENT_FLOW = true

/**
 * The Bookings list is hidden from the Shipping menu for now: orders are followed from Shipping › Orders. The screen
 * and its route stay (an order's "View booking" still opens a booking there); flip this to show the tab again.
 */
export const BOOKINGS_TAB = false
