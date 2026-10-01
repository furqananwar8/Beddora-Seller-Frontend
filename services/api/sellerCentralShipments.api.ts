import { baseApi } from './baseApi'

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
  /** First seen in the last 7 days. */
  isNew: boolean
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

export interface SellerCentralSyncStatus {
  running: boolean
  range?: SellerCentralSyncRange
  startedAt?: string
  finishedAt?: string
  result?: SellerCentralSyncResult
  /** Why the last sync failed, when it did. */
  error?: string
}

export interface StartSellerCentralSyncResponse {
  /** False when a sync was already running and nothing new was started. */
  started: boolean
  status: SellerCentralSyncStatus
}

export const sellerCentralShipmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellerCentralPlans: builder.query<SellerCentralPage, SellerCentralListParams>({
      query: ({ search, status, page, limit }) => ({
        url: '/inventory/seller-central',
        params: { search: search || undefined, status, page, limit },
      }),
      providesTags: ['SellerCentralShipments'],
    }),

    getSellerCentralPlan: builder.query<SellerCentralPlanDetail, string>({
      query: (id) => ({ url: `/inventory/seller-central/${id}` }),
      providesTags: ['SellerCentralShipments'],
    }),

    /** Starts the sync in the background; its end arrives as an SSE event. */
    startSellerCentralSync: builder.mutation<StartSellerCentralSyncResponse, SellerCentralSyncRange>({
      // Starting is instant on the server, so a request that hangs is an error, not a long sync
      query: (range) => ({ url: '/inventory/seller-central/sync', method: 'POST', body: range, timeout: 20_000 }),
      invalidatesTags: ['SellerCentralSync'],
    }),

    getSellerCentralSyncStatus: builder.query<SellerCentralSyncStatus, void>({
      query: () => ({ url: '/inventory/seller-central/sync/status' }),
      providesTags: ['SellerCentralSync'],
    }),

    refreshSellerCentralPlan: builder.mutation<SellerCentralPlanDetail, string>({
      query: (id) => ({ url: `/inventory/seller-central/${id}/refresh`, method: 'POST' }),
      invalidatesTags: ['SellerCentralShipments'],
    }),
  }),
})

export const {
  useGetSellerCentralPlansQuery,
  useGetSellerCentralPlanQuery,
  useStartSellerCentralSyncMutation,
  useGetSellerCentralSyncStatusQuery,
  useRefreshSellerCentralPlanMutation,
} = sellerCentralShipmentsApi
