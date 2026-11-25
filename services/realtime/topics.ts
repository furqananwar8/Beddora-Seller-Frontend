import type { TagType } from '@/services/api/baseApi'

/**
 * Every realtime topic the app listens to, and which cached API data goes stale
 * when one of its events arrives. A new event family is one line here; the
 * provider subscribes and invalidates, screens refetch on their own.
 */
export const REALTIME_TOPICS: Record<string, TagType[]> = {
  notification: ['Notifications'],
  /** Inventory sync toasts; SyncEventListener refetches by event kind. */
  'inventory.sync': [],
  /** A background report export is ready (or failed); `useReportExport` downloads it. */
  export: [],
  /** Settlement figures changed (fee/ad sync, COGS); `useSettlementTileStream` re-streams its cards. */
  'profit.settlement': [],
  /** A background booking finished (or failed); `useBookingJob` toasts it and hands over the shipment. */
  'shipping.booking': ['ShippingShipments', 'ShippingChannelOrders'],
  'finance.partner': ['FinancePartners', 'ProcurementPriceAnalysis'],
  'finance.bank-profile': ['FinanceBankProfiles'],
  'finance.cost-center': ['FinanceCostCenters'],
  'finance.payment-request': ['FinanceRequests', 'ProcurementPurchaseOrders'],
  'finance.payment-process': ['FinanceProcess', 'FinanceRequests', 'ProcurementPurchaseOrders', 'ProcurementPurchaseInvoices'],
  'procurement.product': ['ProcurementProducts', 'ProcurementPriceAnalysis'],
  /** An Excel product import's progress arrives every half second; `ProductImportEventListener` patches the cache itself instead of refetching. */
  'procurement.product-import': [],
  'procurement.purchase-order': ['ProcurementPurchaseOrders'],
  'procurement.purchase-invoice': ['ProcurementPurchaseInvoices'],
  'procurement.packaging-list': ['ProcurementPackagingLists', 'ProcurementPurchaseOrders', 'ProcurementContainers'],
  'procurement.container': ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
  'procurement.price-analysis': ['ProcurementPriceAnalysis'],
  /** Email sent / failed / queued: only the four accounts that may open System > Email receive it. `useEmailLive` patches the cache itself instead of refetching. */
  'system.email': [],
  /** A scan session's counts or status changed (one event per matched batch); `SessionDetailScreen` refetches only its own session. */
  'barcode.scan-session': [],
}

export interface RealtimeMessage<T = Record<string, unknown>> {
  id: string
  topic: string
  type: string
  data: T
  ts: string
  v: 1
}
