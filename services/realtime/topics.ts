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
  /** SKU bindings were saved: the bulk booking screen re-reads its orders so "SKU not mapped" clears itself. */
  'inventory.sku-mapping': [],
  /** A saved address, warehouse or the company name / phone changed (one event, whatever the field): ship-from options re-read, so a screen's "can't ship from here yet" clears itself. */
  'shipping.ship-from': ['ShipFromAddresses', 'Warehouses', 'CompanyDetails'],
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
  /** Per-file progress, completion and failure of a container's document uploads (addressed to the uploader); `ContainerUploadEventListener` folds them into the upload list. */
  'procurement.container-upload': [],
  'procurement.price-analysis': ['ProcurementPriceAnalysis'],
  /** Email sent / failed / queued: only the four accounts that may open System > Email receive it. `useEmailLive` patches the cache itself instead of refetching. */
  'system.email': [],
  /** Background jobs and queues (System > Jobs & Redis): `useJobsLive` patches the cache itself, same accounts as Email. */
  'system.jobs': [],
  /** Redis health, logins, scan locks, tokens and traffic: `useRedisLive` patches the cache itself. */
  'system.redis': [],
  /** A scan session's counts or status changed (one event per matched batch); `SessionDetailScreen` refetches only its own session. */
  'barcode.scan-session': [],
  /** Any stock movement (adjustment, scan, allocation, receipt): the planner, internal inventory and adjustments re-read. */
  'inventory.stock': ['Inventory', 'InventoryAdjustments', 'InboundShipments'],
}

export interface RealtimeMessage<T = Record<string, unknown>> {
  id: string
  topic: string
  type: string
  data: T
  ts: string
  v: 1
}
