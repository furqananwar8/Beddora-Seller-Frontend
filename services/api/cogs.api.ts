import { baseApi } from './baseApi'

/**
 * COGS API endpoints
 * 
 * Provides RTK Query hooks for Cost of Goods Sold management
 * Supports COGS creation, updates, and historical tracking
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export enum CostMethod {
  BATCH = 'BATCH',
  TIME_PERIOD = 'TIME_PERIOD',
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
}

export interface CreateCOGSRequest {
  sku: string
  accountId: string
  marketplaceId?: string
  batchId?: string
  quantity: number
  unitCost: number
  costMethod?: CostMethod
  shipmentCost?: number
  purchaseDate?: string
}

export interface UpdateCOGSRequest {
  quantity?: number
  unitCost?: number
  shipmentCost?: number
  costMethod?: CostMethod
  purchaseDate?: string
}

export interface CreateBatchRequest {
  sku: string
  accountId: string
  quantity: number
  unitCost: number
  notes?: string
  receivedAt?: string
}

export interface COGSResponse {
  id: string
  sku: string
  accountId: string
  marketplaceId: string | null
  batchId: string | null
  quantity: number
  unitCost: number
  totalCost: number
  costMethod: CostMethod
  shipmentCost: number | null
  purchaseDate: string
  createdAt: string
  updatedAt: string
}

export interface BatchResponse {
  id: string
  sku: string
  accountId: string
  quantity: number
  unitCost: number
  totalCost: number
  receivedAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface COGSBySKUResponse {
  sku: string
  accountId: string
  totalQuantity: number
  averageUnitCost: number
  totalCost: number
  entries: COGSResponse[]
  byMarketplace: Array<{
    marketplaceId: string | null
    marketplaceName: string | null
    quantity: number
    totalCost: number
    averageUnitCost: number
  }>
}

export interface COGSHistoricalResponse {
  sku?: string
  accountId: string
  marketplaceId?: string
  startDate: string
  endDate: string
  data: Array<{
    date: string
    quantity: number
    unitCost: number
    totalCost: number
    costMethod: CostMethod
    batchId: string | null
  }>
  summary: {
    totalQuantity: number
    averageUnitCost: number
    totalCost: number
    methodBreakdown: Record<CostMethod, number>
  }
}

export interface BatchDetailsResponse extends BatchResponse {
  cogsEntries: COGSResponse[]
  remainingQuantity: number
  usedQuantity: number
}

interface COGSApiResponse<T> {
  success: boolean
  data: T
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const cogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get COGS by SKU
     * Returns all COGS entries for a specific SKU
     */
    getCOGSBySKU: builder.query<COGSBySKUResponse, { sku: string; accountId: string }>({
      query: ({ sku, accountId }) => ({
        url: `/profit/cogs/${sku}`,
        params: { accountId },
      }),
      transformResponse: (response: COGSApiResponse<COGSBySKUResponse>) => response.data,
      providesTags: (result, error, { sku }) => [{ type: 'Profit', id: `COGS-${sku}` }],
      keepUnusedDataFor: 60,
    }),

    /**
     * Create COGS entry
     */
    createCOGS: builder.mutation<COGSResponse, CreateCOGSRequest>({
      query: (data) => ({
        url: '/profit/cogs',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: COGSApiResponse<COGSResponse>) => response.data,
      invalidatesTags: (result, error, { sku }) => [
        { type: 'Profit', id: `COGS-${sku}` },
        'Profit',
      ],
    }),

    /**
     * Update COGS entry
     */
    updateCOGS: builder.mutation<COGSResponse, { id: string; data: UpdateCOGSRequest }>({
      query: ({ id, data }) => ({
        url: `/profit/cogs/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: COGSApiResponse<COGSResponse>) => response.data,
      invalidatesTags: (result) => [
        ...(result ? [{ type: 'Profit' as const, id: `COGS-${result.sku}` }] : []),
        'Profit',
      ],
    }),

    /**
     * Get batch details
     */
    getBatchDetails: builder.query<BatchDetailsResponse, string>({
      query: (batchId) => `/profit/cogs/batch/${batchId}`,
      transformResponse: (response: COGSApiResponse<BatchDetailsResponse>) => response.data,
      providesTags: (result, error, batchId) => [{ type: 'Profit', id: `Batch-${batchId}` }],
      keepUnusedDataFor: 60,
    }),

    /**
     * Create batch
     */
    createBatch: builder.mutation<BatchResponse, CreateBatchRequest>({
      query: (data) => ({
        url: '/profit/cogs/batch',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: COGSApiResponse<BatchResponse>) => response.data,
      invalidatesTags: ['Profit'],
    }),

    /**
     * Get COGS historical data
     */
    getCOGSHistorical: builder.query<
      COGSHistoricalResponse,
      {
        accountId: string
        sku?: string
        marketplaceId?: string
        startDate?: string
        endDate?: string
      }
    >({
      query: (params) => ({
        url: '/profit/cogs/history',
        params,
      }),
      transformResponse: (response: COGSApiResponse<COGSHistoricalResponse>) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 60,
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useGetCOGSBySKUQuery,
  useCreateCOGSMutation,
  useUpdateCOGSMutation,
  useGetBatchDetailsQuery,
  useCreateBatchMutation,
  useGetCOGSHistoricalQuery,
  // Lazy queries
  useLazyGetCOGSBySKUQuery,
  useLazyGetCOGSHistoricalQuery,
} = cogsApi

