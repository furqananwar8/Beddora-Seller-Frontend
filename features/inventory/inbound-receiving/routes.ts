/** Where Inbound Receiving lives; every link to it goes through here. */
export const RECEIVING_ROUTES = {
  list: '/dashboard/inventory/inbound-receiving',
  update: (id: number | string) => `/dashboard/inventory/inbound-receiving/${id}`,
} as const
