import { baseApi } from './baseApi'

export type StockLocation = 'fba' | 'fbm' | 'prep' | 'awd' | 'ordered'

export interface InventorySummary {
  location: StockLocation
  units: number
  costOfGoods: number
  potentialSales: number
  potentialProfit: number
}

export interface ProductInventoryItem {
  id: string
  sku: string
  asin: string
  title: string
  imageUrl?: string
  stock: number
  reserved: number
  salesVelocity: number
  daysOfStockLeft: number
  sentToFba: number
  prepCenterStock?: number
  ordered: number
  daysUntilNextOrder: number
  recommendedQuantity: number
  stockValue: number
  roi: number
  comment?: string
  supplier?: string
  leadTime?: number
  tags?: string[]
}

export interface InventoryPlannerFilters {
  accountId?: string
  marketplace?: string
  search?: string
  stockLocation?: StockLocation
  lowStock?: boolean
  outOfStock?: boolean
  overstocked?: boolean
  fba?: string[]
  marketplaces?: string[]
  showOos?: boolean
  tags?: string[]
}

export interface CreateShipmentPlanRequest {
  productIds: string[]
  destinationFulfillmentCenter?: string
  shippingMethod?: string
  notes?: string
}

export interface CreatePurchaseOrderRequest {
  productIds: string[]
  supplierId?: string
  quantities: Record<string, number>
  notes?: string
}

export interface AllocatePushItem {
  productId: string
  sku: string
  quantity: number
  locationId?: string
}

export interface AllocatePushRequest {
  items: AllocatePushItem[]
}

export const inventoryPlannerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventorySummary: builder.query<InventorySummary[], InventoryPlannerFilters>({
      query: (filters) => ({
        url: '/inventory/planner/summary',
        params: filters,
      }),
      providesTags: ['Inventory'],
    }),

    getProductInventory: builder.query<ProductInventoryItem[], InventoryPlannerFilters>({
      query: (filters) => ({
        url: '/inventory/products',
        params: filters,
      }),
      providesTags: ['Inventory'],
    }),

    /**
     * Trigger Multi-Channel Stock Push
     */
    pushInventoryAllocation: builder.mutation<
      { success: boolean; message: string },
      AllocatePushRequest
    >({
      query: (body) => ({
        url: '/inventory/allocate-push',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory'],
    }),

    updateProductInventory: builder.mutation<
      void,
      {
        productId: string
        recommendedQuantity?: number
        daysUntilNextOrder?: number
        comment?: string
      }
    >({
      query: ({ productId, ...body }) => ({
        url: `/inventory/planner/products/${productId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Inventory'],
    }),

    createShipmentPlan: builder.mutation<
      { shipmentPlanId: string; url: string },
      CreateShipmentPlanRequest
    >({
      query: (body) => ({
        url: '/inventory/planner/shipment-plan',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory'],
    }),

    createPurchaseOrder: builder.mutation<
      { purchaseOrderId: string; url: string },
      CreatePurchaseOrderRequest
    >({
      query: (body) => ({
        url: '/inventory/planner/purchase-order',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory', 'PurchaseOrders'],
    }),

    exportInventoryData: builder.mutation<
      { downloadUrl: string },
      { filters: InventoryPlannerFilters; format: 'csv' | 'xlsx' }
    >({
      query: (params) => ({
        url: '/inventory/planner/export',
        method: 'POST',
        body: params,
      }),
    }),

    importInventoryData: builder.mutation<
      { imported: number; errors: string[] },
      FormData
    >({
      query: (formData) => ({
        url: '/inventory/planner/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Inventory'],
    }),
  }),
})

export const {
  useGetInventorySummaryQuery,
  useGetProductInventoryQuery,
  usePushInventoryAllocationMutation,
  useUpdateProductInventoryMutation,
  useCreateShipmentPlanMutation,
  useCreatePurchaseOrderMutation,
  useExportInventoryDataMutation,
  useImportInventoryDataMutation,
} = inventoryPlannerApi