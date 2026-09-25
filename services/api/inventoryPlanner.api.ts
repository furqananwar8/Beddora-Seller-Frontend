import { baseApi } from './baseApi'

export type StockLocation = 'fba' | 'fbm' | 'prep' | 'awd' | 'ordered'

export interface InventorySummary {
  location: StockLocation
  units: number
  costOfGoods: number
  potentialSales: number
  potentialProfit: number
}

export type InventoryItemStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'

/** One planner row: warehouse stock synced from the InBound_Logs sheet. */
export interface ProductInventoryItem {
  id: string
  sku: string
  sheetSku: string // SKU as written in the sheet; stays fixed when sku is edited
  description: string
  status: InventoryItemStatus
  lastReceivedDate: string | null // yyyy-mm-dd
  totalQuantity: number
  unallocated: number
  amazonReserve: number
  otherMarketReserve: number
  buffer: number
  salesVelocity: number // units per day, last 30 days
  daysOfStockLeft: number | null // null when there were no sales
  daysUntilNextOrder: number | null
  recommendedQuantity: number
}

export interface InventoryItemChange {
  id: string
  status?: InventoryItemStatus
  description?: string
  sku?: string
}

/** Returned with HTTP 409 when a SKU clashes; nothing is saved. */
export interface InventorySkuConflict {
  id: number
  sku: string
  reason: 'duplicate_in_request' | 'used_by_other_item'
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
  channels?: string[]
  locationId?: string
  productDetails?: {
    sku: string
    title: string
    price: number
    description?: string
  }
}

export interface AllocatePushRequest {
  items: AllocatePushItem[]
}

export interface AllocateFbaItem {
  sku: string
  quantity: number
}

export interface AllocateFbaRequest {
  items: AllocateFbaItem[]
  createInbound: boolean
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

    /** Saves edits to one or more rows, all or nothing. */
    updateInventoryItems: builder.mutation<{ success: boolean; updated: number }, InventoryItemChange[]>({
      query: (items) => ({
        url: '/inventory/items',
        method: 'PATCH',
        body: { items: items.map(({ id, ...change }) => ({ id: Number(id), ...change })) },
      }),
      invalidatesTags: ['Inventory'],
    }),

    /**
     * Trigger Step 1: Save FBA Allocation & Optional SP-API Inbound Request
     */
    allocateFba: builder.mutation<
      { success: boolean; message: string },
      AllocateFbaRequest
    >({
      query: (body) => ({
        url: '/inventory/fba-allocate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory'],
    }),

    /**
     * Trigger Step 2: Multi-Channel Live Stock Push (FBM)
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
  useUpdateInventoryItemsMutation,
  useAllocateFbaMutation,
  usePushInventoryAllocationMutation,
  useUpdateProductInventoryMutation,
  useCreateShipmentPlanMutation,
  useCreatePurchaseOrderMutation,
  useExportInventoryDataMutation,
  useImportInventoryDataMutation,
} = inventoryPlannerApi