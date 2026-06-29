import { baseApi } from './baseApi'

export type RefundDiscrepancyStatus = 'pending' | 'reconciled' | 'ignored'

export interface RefundDiscrepancy {
  id: string
  userId: string
  accountId: string | null
  marketplaceId: string
  productId: string | null
  sku: string | null
  refundQuantity: number
  returnedQuantity: number
  unreimbursedAmount: number
  refundReasonCode: string | null
  status: RefundDiscrepancyStatus
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

export interface RefundDiscrepancyFilters {
  accountId?: string
  marketplaceId?: string
  productId?: string
  sku?: string
  refundReasonCode?: string
  status?: RefundDiscrepancyStatus
  startDate?: string
  endDate?: string
}

export interface RefundDiscrepancyResponse {
  discrepancies: RefundDiscrepancy[]
  summary: {
    totalPending: number
    totalReconciled: number
    totalIgnored: number
    totalUnreimbursedAmount: number
  }
}

export interface CreateRefundDiscrepancyRequest {
  marketplaceId: string
  productId?: string
  sku?: string
  refundQuantity: number
  returnedQuantity: number
  unreimbursedAmount?: number
  refundReasonCode?: string
}

export interface ReconcileRefundDiscrepancyRequest {
  status: RefundDiscrepancyStatus
  notes?: string
}

export const refundDiscrepanciesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRefundDiscrepancies: builder.query<
      { data: RefundDiscrepancyResponse },
      RefundDiscrepancyFilters | void
    >({
      query: (params) => ({
        url: '/reimbursements/refund-discrepancies',
        ...(params && { params }),
      }),
      providesTags: ['RefundDiscrepancies'],
    }),
    getRefundDiscrepanciesByMarketplace: builder.query<
      { data: RefundDiscrepancyResponse },
      { marketplaceId: string; filters?: Omit<RefundDiscrepancyFilters, 'marketplaceId'> }
    >({
      query: ({ marketplaceId, filters = {} }) => ({
        url: `/reimbursements/refund-discrepancies/${marketplaceId}`,
        params: filters,
      }),
      providesTags: (result, error, { marketplaceId }) => [
        { type: 'RefundDiscrepancies', id: marketplaceId },
      ],
    }),
    createRefundDiscrepancy: builder.mutation<
      { data: RefundDiscrepancy },
      CreateRefundDiscrepancyRequest
    >({
      query: (body) => ({
        url: '/reimbursements/refund-discrepancies',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RefundDiscrepancies'],
    }),
    reconcileRefundDiscrepancy: builder.mutation<
      { data: RefundDiscrepancy },
      { id: string; data: ReconcileRefundDiscrepancyRequest }
    >({
      query: ({ id, data }) => ({
        url: `/reimbursements/refund-discrepancies/${id}/reconcile`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'RefundDiscrepancies', id },
        'RefundDiscrepancies',
      ],
    }),
    detectRefundDiscrepancies: builder.mutation<
      { data: { detected: number; message: string } },
      { accountId: string; marketplaceId: string }
    >({
      query: ({ accountId, marketplaceId }) => ({
        url: '/reimbursements/refund-discrepancies/detect',
        method: 'POST',
        params: { accountId, marketplaceId },
      }),
      invalidatesTags: ['RefundDiscrepancies'],
    }),
  }),
})

export const {
  useGetRefundDiscrepanciesQuery,
  useGetRefundDiscrepanciesByMarketplaceQuery,
  useCreateRefundDiscrepancyMutation,
  useReconcileRefundDiscrepancyMutation,
  useDetectRefundDiscrepanciesMutation,
} = refundDiscrepanciesApi

