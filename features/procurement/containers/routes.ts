/** Where the containers section lives; every link to it goes through here. */
export const CONTAINER_ROUTES = {
  list: '/dashboard/containers',
  detail: (id: number | string) => `/dashboard/containers/${id}`,
  costAnalysis: '/dashboard/containers/cost-analysis',
  skuLanded: '/dashboard/containers/sku-landed',
} as const
