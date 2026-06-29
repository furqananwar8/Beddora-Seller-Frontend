import { baseApi } from './baseApi'

/**
 * Stock Location Types
 */
export type StockLocation = 'fba' | 'fbm' | 'prep' | 'awd' | 'ordered'

/**
 * Inventory Summary by Location
 */
export interface InventorySummary {
  location: StockLocation
  units: number
  costOfGoods: number
  potentialSales: number
  potentialProfit: number
}

/**
 * Product Inventory Item
 */
export interface ProductInventoryItem {
  id: string
  sku: string
  asin: string
  title: string
  imageUrl?: string
  fbaFbmStock: number
  reserved: number
  salesVelocity: number // units per day
  daysOfStockLeft: number
  sentToFba: number
  prepCenterStock: number
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

/**
 * Inventory Planner Filters
 */
export interface InventoryPlannerFilters {
  accountId?: string
  marketplace?: string
  search?: string
  stockLocation?: StockLocation
  lowStock?: boolean
  outOfStock?: boolean
  overstocked?: boolean
  tags?: string[]
}

/**
 * Shipment Plan Request
 */
export interface CreateShipmentPlanRequest {
  productIds: string[]
  destinationFulfillmentCenter?: string
  shippingMethod?: string
  notes?: string
}

/**
 * Purchase Order Request
 */
export interface CreatePurchaseOrderRequest {
  productIds: string[]
  supplierId?: string
  quantities: Record<string, number>
  notes?: string
}

/**
 * Inventory Planner API
 */
export const inventoryPlannerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get inventory summary by location
     */
    getInventorySummary: builder.query<InventorySummary[], InventoryPlannerFilters>({
      query: (filters) => ({
        url: '/inventory/planner/summary',
        params: filters,
      }),
      providesTags: ['Inventory'],
    }),

    /**
     * Get product inventory items
     */
    getProductInventory: builder.query<ProductInventoryItem[], InventoryPlannerFilters>({
      query: (filters) => ({
        url: '/inventory/planner/products',
        params: filters,
      }),
      providesTags: ['Inventory'],
    }),

    /**
     * Update product inventory settings
     */
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

    /**
     * Create shipment plan
     */
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

    /**
     * Create purchase order
     */
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

    /**
     * Export inventory data
     */
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

    /**
     * Import inventory data
     */
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
  useUpdateProductInventoryMutation,
  useCreateShipmentPlanMutation,
  useCreatePurchaseOrderMutation,
  useExportInventoryDataMutation,
  useImportInventoryDataMutation,
} = inventoryPlannerApi
