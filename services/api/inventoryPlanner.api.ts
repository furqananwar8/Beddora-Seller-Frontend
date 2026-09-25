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

export type StockBucket = 'UNALLOCATED' | 'FBA_POOL' | 'FBA_RESERVED' | 'BUFFER' | 'FBM'
export type BucketBalances = Record<StockBucket, number>

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
  balances: BucketBalances // raw per-bucket stock, echoed back when saving an allocation
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

export interface ChannelTarget {
  id: string // e.g. "Walmart.CA"
  channel: 'Shopify' | 'Walmart' | 'Temu' | 'TikTok' | 'Amazon'
  region: 'US' | 'CA' | 'MX'
  name: string
  connected: boolean
}

/** Target split for one item; `fba` includes units held by FBA shipments. */
export interface AllocationSplit {
  fba: number
  buffer: number
  fbm: number
}

export interface AllocationItemInput extends AllocationSplit {
  inventoryItemId: number
  expected: BucketBalances // balances the drawer showed; a mismatch means stock changed meanwhile
}

export interface SaveAllocationItem extends AllocationItemInput {
  channels: string[]
}

/** One stock movement the backend's planner will record, e.g. UNALLOCATED → FBM 25. */
export interface PlannedMove {
  from: StockBucket
  to: StockBucket
  quantity: number
  reason: 'ALLOCATE' | 'REALLOCATE'
}

export interface ItemAllocationResult {
  inventoryItemId: number
  sku: string
  before: BucketBalances
  after: BucketBalances
  moves: PlannedMove[]
}

export interface PushResult {
  inventoryItemId: number
  sku: string
  channel: string
  quantity: number
  success: boolean
  action?: string
  error?: string
}

export interface SaveAllocationResponse {
  allocationId: string
  items: ItemAllocationResult[]
  pushResults: PushResult[]
}

export interface AllocationPreview {
  items: ItemAllocationResult[]
  conflicts: AllocationConflict[]
}

/** Returned with HTTP 409 when an item changed or can't take the split; nothing is saved. */
export interface AllocationConflict {
  inventoryItemId: number
  sku: string
  reason: 'stock_changed' | 'invalid_split' | 'not_found'
  message: string
}

export interface PushStockItem {
  inventoryItemId: number
  channels: string[]
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

    getChannelTargets: builder.query<ChannelTarget[], void>({
      query: () => ({ url: '/inventory/channels' }),
    }),

    /** The movements a save would record right now, from the same rules as saving. */
    previewAllocation: builder.query<AllocationPreview, AllocationItemInput[]>({
      query: (items) => ({ url: '/inventory/allocations/preview', method: 'POST', body: { items } }),
    }),

    /** Saves the FBA / buffer / FBM split, then pushes FBM stock to each item's channels. */
    saveAllocation: builder.mutation<SaveAllocationResponse, SaveAllocationItem[]>({
      query: (items) => ({ url: '/inventory/allocations', method: 'POST', body: { items } }),
      invalidatesTags: ['Inventory'],
    }),

    /** Pushes current FBM stock without changing the split (retries, push to all). */
    pushStock: builder.mutation<{ results: PushResult[] }, PushStockItem[]>({
      query: (items) => ({ url: '/inventory/push', method: 'POST', body: { items } }),
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
  useGetChannelTargetsQuery,
  usePreviewAllocationQuery,
  useSaveAllocationMutation,
  usePushStockMutation,
  useUpdateProductInventoryMutation,
  useCreateShipmentPlanMutation,
  useCreatePurchaseOrderMutation,
  useExportInventoryDataMutation,
  useImportInventoryDataMutation,
} = inventoryPlannerApi