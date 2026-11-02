/**
 * Manual shipments (Create shipment: Address Info › Shipment Info › Rates › Booking) are hidden for now: parcels are
 * booked from channel orders instead. The screens and the route stay; flip this to bring the entry points back.
 */
export const MANUAL_SHIPMENT_FLOW = false

/**
 * The Bookings list is hidden from the Shipping menu for now: orders are followed from Shipping › Orders. The screen
 * and its route stay (an order's "View booking" still opens a booking there); flip this to show the tab again.
 */
export const BOOKINGS_TAB = false
