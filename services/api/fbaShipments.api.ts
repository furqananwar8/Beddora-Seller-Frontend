import { baseApi } from './baseApi'

/**
 * FBA Shipment Status Types
 */
export type FBAShipmentStatus = 
  | 'working' 
  | 'ready_to_ship' 
  | 'shipped' 
  | 'in_transit' 
  | 'receiving' 
  | 'received' 
  | 'cancelled' 
  | 'deleted' 
  | 'error'

/**
 * FBA Shipment Product
 */
export interface FBAShipmentProduct {
  id: string
  sku: string
  fnsku: string
  title: string
  imageUrl?: string
  quantity: number
  quantityReceived?: number
  condition: string
}

/**
 * FBA Shipment Item
 */
export interface FBAShipmentItem {
  id: string
  shipmentId: string
  shipmentName: string
  planId?: string
  date: string
  destination: string
  destinationAddress?: string
  products: FBAShipmentProduct[]
  totalUnits: number
  unitsReceived: number
  percentReceived: number
  status: FBAShipmentStatus
  lastUpdate: string
  purchaseOrderIds?: string[]
  comment?: string
  trackingNumber?: string
  carrier?: string
  estimatedArrival?: string
  createdAt: string
  updatedAt: string
}

/**
 * FBA Shipment Summary
 */
export interface FBAShipmentSummary {
  totalShipments: number
  activeShipments: number
  inTransit: number
  receiving: number
  completed: number
  totalUnits: number
  unitsReceived: number
}

/**
 * FBA Shipment Filters
 */
export interface FBAShipmentFilters {
  accountId?: string
  search?: string
  shipmentId?: string
  status?: FBAShipmentStatus
  startDate?: string
  endDate?: string
  destination?: string
}

/**
 * Create FBA Shipment Request
 */
export interface CreateFBAShipmentRequest {
  shipmentName: string
  destination: string
  products: {
    sku: string
    quantity: number
  }[]
  estimatedArrival?: string
  comment?: string
}

/**
 * Update FBA Shipment Request
 */
export interface UpdateFBAShipmentRequest {
  shipmentName?: string
  destination?: string
  status?: FBAShipmentStatus
  trackingNumber?: string
  carrier?: string
  estimatedArrival?: string
  comment?: string
}

/**
 * FBA Shipments API
 */
export const fbaShipmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get FBA shipment summary
     */
    getFBAShipmentSummary: builder.query<FBAShipmentSummary, FBAShipmentFilters | void>({
      query: (filters) => ({
        url: '/fba-shipments/summary',
        params: filters ?? undefined,
      }),
      providesTags: ['InboundShipments'],
    }),

    /**
     * Get all FBA shipments
     */
    getFBAShipments: builder.query<FBAShipmentItem[], FBAShipmentFilters | void>({
      query: (filters) => ({
        url: '/fba-shipments',
        params: filters ?? undefined,
      }),
      providesTags: ['InboundShipments'],
    }),

    /**
     * Get single FBA shipment
     */
    getFBAShipment: builder.query<FBAShipmentItem, string>({
      query: (id) => ({
        url: `/fba-shipments/${id}`,
      }),
      providesTags: ['InboundShipments'],
    }),

    /**
     * Create FBA shipment
     */
    createFBAShipment: builder.mutation<FBAShipmentItem, CreateFBAShipmentRequest>({
      query: (body) => ({
        url: '/fba-shipments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InboundShipments'],
    }),

    /**
     * Update FBA shipment
     */
    updateFBAShipment: builder.mutation<
      FBAShipmentItem,
      { id: string; data: UpdateFBAShipmentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/fba-shipments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['InboundShipments'],
    }),

    /**
     * Delete FBA shipment
     */
    deleteFBAShipment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/fba-shipments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['InboundShipments'],
    }),

    /**
     * Update shipment status
     */
    updateShipmentStatus: builder.mutation<void, { id: string; status: FBAShipmentStatus }>({
      query: ({ id, status }) => ({
        url: `/fba-shipments/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['InboundShipments'],
    }),

    /**
     * Link purchase order to shipment
     */
    linkPurchaseOrder: builder.mutation<void, { shipmentId: string; purchaseOrderId: string }>({
      query: ({ shipmentId, purchaseOrderId }) => ({
        url: `/fba-shipments/${shipmentId}/purchase-orders`,
        method: 'POST',
        body: { purchaseOrderId },
      }),
      invalidatesTags: ['InboundShipments', 'PurchaseOrders'],
    }),
  }),
})

export const {
  useGetFBAShipmentSummaryQuery,
  useGetFBAShipmentsQuery,
  useGetFBAShipmentQuery,
  useCreateFBAShipmentMutation,
  useUpdateFBAShipmentMutation,
  useDeleteFBAShipmentMutation,
  useUpdateShipmentStatusMutation,
  useLinkPurchaseOrderMutation,
} = fbaShipmentsApi
