/**
 * Manual shipments (Create shipment: Sales channel + Address Info › Shipment Info › Rates › Booking), next to booking
 * channel orders. A manual shipment records its platform and marketplace; no channel order is linked or updated.
 */
export const MANUAL_SHIPMENT_FLOW = true

/**
 * The Bookings list is in the Shipping menu: every booking with its Source (manual or channel order), and the manual
 * shipments saved as drafts. Set this to false to hide the tab (the route stays; an order's "View booking" opens it).
 */
export const BOOKINGS_TAB = true
