import { baseApi } from './baseApi'

/**
 * Purchase Order Status Types
 */
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'shipped' | 'received' | 'cancelled'

/**
 * Purchase Order Summary by Status
 */
export interface PurchaseOrderSummary {
  status: PurchaseOrderStatus
  count: number
  totalCost: number
  totalUnits: number
}

/**
 * Purchase Order Item
 */
export interface PurchaseOrderItem {
  id: string
  poNumber: string
  poDate: string
  supplier: {
    id: string
    name: string
  }
  products: {
    id: string
    sku: string
    title: string
    quantity: number
    unitCost: number
  }[]
  totalUnits: number
  totalCost: number
  estimatedArrival?: string
  comment?: string
  fbaShipments?: string[]
  status: PurchaseOrderStatus
  createdAt: string
  updatedAt: string
}

/**
 * Purchase Order Filters
 */
export interface PurchaseOrderFilters {
  accountId?: string
  search?: string
  searchByPOName?: string
  supplierId?: string
  status?: PurchaseOrderStatus
  startDate?: string
  endDate?: string
}

/**
 * Create Purchase Order Request
 */
export interface CreatePurchaseOrderRequest {
  supplierId: string
  products: {
    productId: string
    quantity: number
    unitCost: number
  }[]
  estimatedArrival?: string
  comment?: string
}

/**
 * Update Purchase Order Request
 */
export interface UpdatePurchaseOrderRequest {
  supplierId?: string
  products?: {
    productId: string
    quantity: number
    unitCost: number
  }[]
  estimatedArrival?: string
  comment?: string
  status?: PurchaseOrderStatus
}

/**
 * Purchase Orders API
 */
export const purchaseOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get purchase order summary by status
     */
    getPurchaseOrderSummary: builder.query<PurchaseOrderSummary[], PurchaseOrderFilters>({
      query: (filters) => ({
        url: '/purchase-orders/summary',
        params: filters,
      }),
      providesTags: ['PurchaseOrders'],
    }),

    /**
     * Get all purchase orders
     */
    getPurchaseOrders: builder.query<PurchaseOrderItem[], PurchaseOrderFilters>({
      query: (filters) => ({
        url: '/purchase-orders',
        params: filters,
      }),
      providesTags: ['PurchaseOrders'],
    }),

    /**
     * Get single purchase order
     */
    getPurchaseOrder: builder.query<PurchaseOrderItem, string>({
      query: (id) => ({
        url: `/purchase-orders/${id}`,
      }),
      providesTags: ['PurchaseOrders'],
    }),

    /**
     * Create purchase order
     */
    createPurchaseOrder: builder.mutation<PurchaseOrderItem, CreatePurchaseOrderRequest>({
      query: (body) => ({
        url: '/purchase-orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PurchaseOrders'],
    }),

    /**
     * Update purchase order
     */
    updatePurchaseOrder: builder.mutation<
      PurchaseOrderItem,
      { id: string; data: UpdatePurchaseOrderRequest }
    >({
      query: ({ id, data }) => ({
        url: `/purchase-orders/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PurchaseOrders'],
    }),

    /**
     * Delete purchase order
     */
    deletePurchaseOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/purchase-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PurchaseOrders'],
    }),

    /**
     * Update purchase order status
     */
    updatePurchaseOrderStatus: builder.mutation<
      void,
      { id: string; status: PurchaseOrderStatus }
    >({
      query: ({ id, status }) => ({
        url: `/purchase-orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['PurchaseOrders'],
    }),
  }),
})

export const {
  useGetPurchaseOrderSummaryQuery,
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
} = purchaseOrdersApi
