/** Where the containers section lives; every link to it goes through here. */
export const CONTAINER_ROUTES = {
  list: '/dashboard/containers',
  detail: (id: number | string) => `/dashboard/containers/${id}`,
  costAnalysis: '/dashboard/containers/cost-analysis',
  /** The cost analysis with this container (its CID#, as shown) already open. */
  costAnalysisOf: (containerNo: string) => `/dashboard/containers/cost-analysis?container=${encodeURIComponent(containerNo)}`,
  skuLanded: '/dashboard/containers/sku-landed',
} as const
