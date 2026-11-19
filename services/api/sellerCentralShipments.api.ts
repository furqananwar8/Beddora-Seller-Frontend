import { baseApi } from './baseApi'

/** The platforms the Seller Central screen can pull from (the same names as Shipments channels). */
export type SellerCentralChannel = 'amazon_fba' | 'walmart_wfs'

export type SellerCentralPlanStatus = 'ACTIVE' | 'SHIPPED' | 'VOIDED' | 'ERRORED'

export interface SellerCentralItem {
  msku: string
  asin: string
  fnsku: string
  quantity: number
}

export interface SellerCentralShipment {
  shipmentId: string
  /** FBA15… ID printed on labels. */
  confirmationId?: string
  name?: string
  status?: string
  destination?: string
  destinationCity?: string
  deliveryWindow?: { start: string; end: string }
  readyToShip?: { start: string; end: string }
  trackingEntered: number
  boxes: number
  units: number
  items: SellerCentralItem[]
}

export interface SellerCentralPlan {
  inboundPlanId: string
  name: string
  status: SellerCentralPlanStatus | string
  marketplaces: string[]
  createdAt: string | null
  updatedAt: string | null
  shipmentCount: number
  units: number
  skus: number
  destinations: string[]
  hasDetails: boolean
  syncedAt: string
}

export interface SellerCentralPlanDetail extends SellerCentralPlan {
  sourceAddress: Record<string, string> | null
  shipments: SellerCentralShipment[]
}

export interface SellerCentralListParams {
  search?: string
  status?: SellerCentralPlanStatus
  page: number
  limit: number
}

export interface SellerCentralPage {
  success: boolean
  data: SellerCentralPlan[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
  lastSyncedAt: string | null
}

export interface WfsSellerCentralItem {
  sku: string
  description?: string
  /** Units Walmart expects. */
  quantity: number
  received: number
  damaged: number
}

export interface WfsSellerCentralShipment {
  /** Identifies the shipment in the API ("us:12345"). */
  key: string
  shipmentId: string
  inboundOrderId: string | null
  marketplace: string
  status: string
  fulfillmentCenter: string | null
  fcLocation: string | null
  expectedDeliveryAt: string | null
  createdAt: string | null
  updatedAt: string | null
  units: number
  received: number
  skus: number
  hasDetails: boolean
  syncedAt: string
}

export interface WfsSellerCentralShipmentDetail extends WfsSellerCentralShipment {
  shipToAddress: Record<string, string | undefined> | null
  items: WfsSellerCentralItem[]
}

export interface WfsSellerCentralListParams {
  search?: string
  status?: string
  page: number
  limit: number
}

export interface WfsSellerCentralPage {
  success: boolean
  data: WfsSellerCentralShipment[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
  lastSyncedAt: string | null
  /** The statuses Walmart reported for the shipments held, for the filter. */
  statuses: string[]
}

export interface WfsSellerCentralSyncResult {
  seen: number
  added: number
  detailed: number
  skippedOwn: number
  failed: number
  /** Markets that weren't connected or couldn't be read. */
  marketErrors: string[]
}

export interface SellerCentralSyncResult {
  seen: number
  added: number
  detailed: number
  skippedOwn: number
  failed: number
}

/** The days of Amazon changes to sync (yyyy-MM-dd, both included). */
export interface SellerCentralSyncRange {
  from: string
  to: string
}

export interface SellerCentralSyncStatus<Result = SellerCentralSyncResult> {
  running: boolean
  range?: SellerCentralSyncRange
  startedAt?: string
  finishedAt?: string
  result?: Result
  /** Why the last sync failed, when it did. */
  error?: string
}

/** Each platform's sync state, keyed by channel. */
export interface SellerCentralSyncStatuses {
  amazon_fba: SellerCentralSyncStatus
  walmart_wfs: SellerCentralSyncStatus<WfsSellerCentralSyncResult>
}

export interface StartSellerCentralSyncRequest extends SellerCentralSyncRange {
  /** The platforms to pull; one or both. */
  channels: SellerCentralChannel[]
}

/** One entry per platform that was asked for. */
export type StartSellerCentralSyncResponse = Partial<{
  [C in SellerCentralChannel]: {
    /** False when that platform's sync was already running and nothing new was started. */
    started: boolean
    status: SellerCentralSyncStatuses[C]
  }
}>

export const sellerCentralShipmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellerCentralPlans: builder.query<SellerCentralPage, SellerCentralListParams>({
      query: ({ search, status, page, limit }) => ({
        url: '/inventory/seller-central',
        params: { channel: 'amazon_fba', search: search || undefined, status, page, limit },
      }),
      providesTags: ['SellerCentralShipments'],
    }),

    getSellerCentralPlan: builder.query<SellerCentralPlanDetail, string>({
      query: (id) => ({ url: `/inventory/seller-central/${id}`, params: { channel: 'amazon_fba' } }),
      providesTags: ['SellerCentralShipments'],
    }),

    refreshSellerCentralPlan: builder.mutation<SellerCentralPlanDetail, string>({
      query: (id) => ({ url: `/inventory/seller-central/${id}/refresh`, method: 'POST', params: { channel: 'amazon_fba' } }),
      invalidatesTags: ['SellerCentralShipments'],
    }),

    getWfsSellerCentralShipments: builder.query<WfsSellerCentralPage, WfsSellerCentralListParams>({
      query: ({ search, status, page, limit }) => ({
        url: '/inventory/seller-central',
        params: { channel: 'walmart_wfs', search: search || undefined, status, page, limit },
      }),
      providesTags: ['SellerCentralShipments'],
    }),

    getWfsSellerCentralShipment: builder.query<WfsSellerCentralShipmentDetail, string>({
      query: (key) => ({ url: `/inventory/seller-central/${encodeURIComponent(key)}`, params: { channel: 'walmart_wfs' } }),
      providesTags: ['SellerCentralShipments'],
    }),

    refreshWfsSellerCentralShipment: builder.mutation<WfsSellerCentralShipmentDetail, string>({
      query: (key) => ({ url: `/inventory/seller-central/${encodeURIComponent(key)}/refresh`, method: 'POST', params: { channel: 'walmart_wfs' } }),
      invalidatesTags: ['SellerCentralShipments'],
    }),

    /** Starts the sync of each chosen platform in the background; each end arrives as an SSE event. */
    startSellerCentralSync: builder.mutation<StartSellerCentralSyncResponse, StartSellerCentralSyncRequest>({
      // Starting is instant on the server, so a request that hangs is an error, not a long sync
      query: (body) => ({ url: '/inventory/seller-central/sync', method: 'POST', body, timeout: 20_000 }),
      invalidatesTags: ['SellerCentralSync'],
    }),

    getSellerCentralSyncStatus: builder.query<SellerCentralSyncStatuses, void>({
      query: () => ({ url: '/inventory/seller-central/sync/status' }),
      providesTags: ['SellerCentralSync'],
    }),
  }),
})

export const {
  useGetSellerCentralPlansQuery,
  useGetSellerCentralPlanQuery,
  useRefreshSellerCentralPlanMutation,
  useGetWfsSellerCentralShipmentsQuery,
  useGetWfsSellerCentralShipmentQuery,
  useRefreshWfsSellerCentralShipmentMutation,
  useStartSellerCentralSyncMutation,
  useGetSellerCentralSyncStatusQuery,
} = sellerCentralShipmentsApi
