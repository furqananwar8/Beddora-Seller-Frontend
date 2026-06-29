import { baseApi } from './baseApi'

/**
 * FBA Inventory Alerts API endpoints
 * 
 * Manages FBA lost and damaged inventory detection and alerts
 */

export type FbaAlertType = 'lost' | 'damaged'
export type FbaAlertStatus = 'pending' | 'reimbursed' | 'ignored' | 'disputed'

export interface FbaInventoryAlert {
  id: string
  userId: string
  accountId: string | null
  marketplaceId: string
  productId: string | null
  sku: string | null
  alertType: FbaAlertType
  reportedQuantity: number
  reimbursedQuantity: number
  estimatedAmount: number
  status: FbaAlertStatus
  notes: string | null
  detectedAt: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  marketplace?: {
    id: string
    name: string
  }
  product?: {
    id: string
    title: string
    sku: string
    cost: number
  }
}

export interface FbaInventoryAlertFilters {
  accountId?: string
  marketplaceId?: string
  productId?: string
  sku?: string
  alertType?: FbaAlertType
  status?: FbaAlertStatus
  startDate?: string
  endDate?: string
}

export interface FbaInventoryAlertResponse {
  alerts: FbaInventoryAlert[]
  summary: {
    totalPending: number
    totalReimbursed: number
    totalIgnored: number
    totalDisputed: number
    totalEstimatedAmount: number
    totalReimbursedAmount: number
  }
}

export interface CreateFbaInventoryAlertRequest {
  marketplaceId: string
  productId?: string
  sku?: string
  alertType: FbaAlertType
  reportedQuantity: number
  reimbursedQuantity?: number
  estimatedAmount?: number
  notes?: string
}

export interface ResolveFbaInventoryAlertRequest {
  status: FbaAlertStatus
  reimbursedQuantity?: number
  notes?: string
}

export const fbaInventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all FBA inventory alerts
     */
    getFbaInventoryAlerts: builder.query<
      { data: FbaInventoryAlertResponse },
      FbaInventoryAlertFilters | void
    >({
      query: (params) => ({
        url: '/reimbursements/fba',
        ...(params && { params }),
      }),
      providesTags: ['Alerts'],
    }),

    /**
     * Get FBA inventory alerts for a specific marketplace
     */
    getFbaInventoryAlertsByMarketplace: builder.query<
      { data: FbaInventoryAlertResponse },
      { marketplaceId: string; filters?: Omit<FbaInventoryAlertFilters, 'marketplaceId'> }
    >({
      query: ({ marketplaceId, filters = {} }) => ({
        url: `/reimbursements/fba/${marketplaceId}`,
        params: filters,
      }),
      providesTags: (result, error, { marketplaceId }) => [
        { type: 'Alerts', id: marketplaceId },
      ],
    }),

    /**
     * Get a single FBA inventory alert by ID
     */
    getFbaInventoryAlert: builder.query<{ data: FbaInventoryAlert }, string>({
      query: (id) => `/reimbursements/fba/alert/${id}`,
      providesTags: (result, error, id) => [{ type: 'Alerts', id }],
    }),

    /**
     * Create a new FBA inventory alert
     */
    createFbaInventoryAlert: builder.mutation<
      { data: FbaInventoryAlert },
      CreateFbaInventoryAlertRequest
    >({
      query: (body) => ({
        url: '/reimbursements/fba',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Alerts'],
    }),

    /**
     * Resolve an FBA inventory alert
     */
    resolveFbaInventoryAlert: builder.mutation<
      { data: FbaInventoryAlert },
      { id: string; data: ResolveFbaInventoryAlertRequest }
    >({
      query: ({ id, data }) => ({
        url: `/reimbursements/fba/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Alerts', id }, 'Alerts'],
    }),

    /**
     * Trigger FBA inventory discrepancy detection
     */
    detectFbaInventoryDiscrepancies: builder.mutation<
      { data: { detected: number; message: string } },
      { accountId: string; marketplaceId: string }
    >({
      query: ({ accountId, marketplaceId }) => ({
        url: '/reimbursements/fba/detect',
        method: 'POST',
        params: { accountId, marketplaceId },
      }),
      invalidatesTags: ['Alerts'],
    }),
  }),
})

export const {
  useGetFbaInventoryAlertsQuery,
  useGetFbaInventoryAlertsByMarketplaceQuery,
  useGetFbaInventoryAlertQuery,
  useCreateFbaInventoryAlertMutation,
  useResolveFbaInventoryAlertMutation,
  useDetectFbaInventoryDiscrepanciesMutation,
} = fbaInventoryApi

