import type { TagType } from '@/services/api/baseApi'

/**
 * Every realtime topic the app listens to, and which cached API data goes stale
 * when one of its events arrives. A new event family is one line here; the
 * provider subscribes and invalidates, screens refetch on their own.
 */
export const REALTIME_TOPICS: Record<string, TagType[]> = {
  notification: ['Notifications'],
  'finance.partner': ['FinancePartners', 'ProcurementPriceAnalysis'],
  'finance.payment-request': ['FinanceRequests', 'ProcurementPurchaseOrders'],
  'finance.payment-process': ['FinanceProcess', 'FinanceRequests', 'ProcurementPurchaseOrders'],
  'procurement.product': ['ProcurementProducts', 'ProcurementPriceAnalysis'],
  'procurement.purchase-order': ['ProcurementPurchaseOrders'],
  'procurement.packaging-list': ['ProcurementPackagingLists', 'ProcurementPurchaseOrders', 'ProcurementContainers'],
  'procurement.container': ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
  'procurement.price-analysis': ['ProcurementPriceAnalysis'],
}

export interface RealtimeMessage<T = Record<string, unknown>> {
  id: string
  topic: string
  type: string
  data: T
  ts: string
  v: 1
}
