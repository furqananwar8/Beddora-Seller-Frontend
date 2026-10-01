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

    /** Pulls plans and their shipment details from Amazon. */
    syncSellerCentralPlans: builder.mutation<SellerCentralSyncResult, void>({
      query: () => ({ url: '/inventory/seller-central/sync', method: 'POST' }),
      invalidatesTags: ['SellerCentralShipments'],
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
  useSyncSellerCentralPlansMutation,
  useRefreshSellerCentralPlanMutation,
} = sellerCentralShipmentsApi
