import { baseApi } from './baseApi'

export interface ReturnFilters {
  accountId?: string
  marketplaceId?: string
  sku?: string
  reasonCode?: string
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month'
}

export interface ReturnEntry {
  id: string
  orderId: string
  sku: string
  accountId: string
  marketplaceId: string | null
  quantityReturned: number
  reasonCode: string
  refundAmount: number
  feeAmount: number
  isSellable: boolean
  createdAt: string
  updatedAt: string
}

export interface ReturnSummary {
  totalReturnedUnits: number
  totalRefundAmount: number
  totalFeeAmount: number
  sellableUnits: number
  unsellableUnits: number
  lostUnits: number
  byReasonCode: Record<string, { units: number; refundAmount: number; feeAmount: number }>
  byMarketplace: Record<string, { units: number; refundAmount: number; feeAmount: number }>
  trends: Array<{ period: string; units: number; refundAmount: number; feeAmount: number }>
}

export interface ReturnsListResponse {
  success: boolean
  data: ReturnEntry[]
  totalRecords: number
}

export interface ReturnsSummaryResponse {
  success: boolean
  data: ReturnSummary
}

export interface CreateReturnRequest {
  orderId: string
  sku: string
  accountId: string
  marketplaceId?: string
  quantityReturned: number
  reasonCode: string
  refundAmount: number
  feeAmount: number
  isSellable: boolean
}

export interface UpdateReturnRequest {
  sku?: string
  marketplaceId?: string
  quantityReturned?: number
  reasonCode?: string
  refundAmount?: number
  feeAmount?: number
  isSellable?: boolean
}

export const returnsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReturns: builder.query<ReturnEntry[], ReturnFilters>({
      query: (filters) => ({
        url: '/profit/returns',
        params: filters,
      }),
      transformResponse: (response: ReturnsListResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 30,
    }),
    getReturnsSummary: builder.query<ReturnSummary, ReturnFilters>({
      query: (filters) => ({
        url: '/profit/returns/summary',
        params: filters,
      }),
      transformResponse: (response: ReturnsSummaryResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 30,
    }),
    createReturn: builder.mutation<{ success: boolean; data: ReturnEntry }, CreateReturnRequest>({
      query: (data) => ({
        url: '/profit/returns',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Profit'],
    }),
    updateReturn: builder.mutation<
      { success: boolean; data: ReturnEntry },
      { id: string; data: UpdateReturnRequest }
    >({
      query: ({ id, data }) => ({
        url: `/profit/returns/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Profit'],
    }),
    deleteReturn: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/profit/returns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profit'],
    }),
  }),
})

export const {
  useGetReturnsQuery,
  useGetReturnsSummaryQuery,
  useCreateReturnMutation,
  useUpdateReturnMutation,
  useDeleteReturnMutation,
} = returnsApi

