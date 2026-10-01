/**
 * Seller Central plans often have no name. The list shows nothing for those; this is
 * only for places that need some text, like the details window title and toasts.
 */
export const planTitle = (name: string | null | undefined): string => name?.trim() || 'Shipment plan'
