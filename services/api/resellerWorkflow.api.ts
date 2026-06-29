import { baseApi } from './baseApi'

/**
 * Workflow Status Types
 */
export type WorkflowStatus = 'draft' | 'in_progress' | 'shipped' | 'completed' | 'cancelled'

/**
 * Product Condition Types
 */
export type ProductCondition = 'new' | 'like_new' | 'very_good' | 'good' | 'acceptable'

/**
 * Fulfillment Type
 */
export type FulfillmentType = 'FBA' | 'FBM'

/**
 * Workflow Batch Product
 */
export interface WorkflowBatchProduct {
  id: string
  asin: string
  sku: string
  fnsku?: string
  title: string
  imageUrl?: string
  condition: ProductCondition
  quantity: number
  costOfGoods: number
  expectedPrice?: number
  barcode?: string
  notes?: string
  createdAt: string
}

/**
 * FBA Shipment Info
 */
export interface FBAShipmentInfo {
  id: string
  shipmentId: string
  shipmentName: string
  destinationCenter: string
  status: string
  boxCount?: number
  totalUnits: number
  createdAt: string
  shippedDate?: string
  deliveredDate?: string
}

/**
 * Reseller Workflow Batch
 */
export interface ResellerWorkflowBatch {
  id: string
  batchNumber: string
  name: string
  status: WorkflowStatus
  fulfillmentType: FulfillmentType
  products: WorkflowBatchProduct[]
  totalProducts: number
  totalUnits: number
  totalCOGS: number
  expectedRevenue?: number
  expectedProfit?: number
  fbaShipments?: FBAShipmentInfo[]
  notes?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

/**
 * Workflow Summary Stats
 */
export interface WorkflowSummary {
  totalBatches: number
  activeBatches: number
  totalProducts: number
  totalUnits: number
  totalCOGS: number
  expectedRevenue: number
  expectedProfit: number
}

/**
 * Workflow Filters
 */
export interface WorkflowFilters {
  accountId?: string
  status?: WorkflowStatus
  fulfillmentType?: FulfillmentType
  search?: string
  startDate?: string
  endDate?: string
}

/**
 * Create Workflow Batch Request
 */
export interface CreateWorkflowBatchRequest {
  name: string
  fulfillmentType: FulfillmentType
  notes?: string
}

/**
 * Add Product to Batch Request
 */
export interface AddProductToBatchRequest {
  asin?: string
  sku?: string
  barcode?: string
  condition: ProductCondition
  quantity: number
  costOfGoods: number
  notes?: string
}

/**
 * Update Batch Product Request
 */
export interface UpdateBatchProductRequest {
  condition?: ProductCondition
  quantity?: number
  costOfGoods?: number
  notes?: string
}

/**
 * Create FBA Shipment Request
 */
export interface CreateFBAShipmentFromBatchRequest {
  batchId: string
  productIds: string[]
  destinationCenter?: string
  shipmentName?: string
}

/**
 * Reseller Workflow API
 */
export const resellerWorkflowApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get workflow summary
     */
    getWorkflowSummary: builder.query<WorkflowSummary, WorkflowFilters | void>({
      query: (filters) => ({
        url: '/reseller-workflow/summary',
        params: filters ?? undefined,
      }),
      providesTags: ['ResellerWorkflow'],
    }),

    /**
     * Get all workflow batches
     */
    getWorkflowBatches: builder.query<ResellerWorkflowBatch[], WorkflowFilters | void>({
      query: (filters) => ({
        url: '/reseller-workflow/batches',
        params: filters ?? undefined,
      }),
      providesTags: ['ResellerWorkflow'],
    }),

    /**
     * Get single workflow batch
     */
    getWorkflowBatch: builder.query<ResellerWorkflowBatch, string>({
      query: (id) => ({
        url: `/reseller-workflow/batches/${id}`,
      }),
      providesTags: ['ResellerWorkflow'],
    }),

    /**
     * Create workflow batch
     */
    createWorkflowBatch: builder.mutation<ResellerWorkflowBatch, CreateWorkflowBatchRequest>({
      query: (body) => ({
        url: '/reseller-workflow/batches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Update workflow batch
     */
    updateWorkflowBatch: builder.mutation<
      ResellerWorkflowBatch,
      { id: string; data: Partial<CreateWorkflowBatchRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/reseller-workflow/batches/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Delete workflow batch
     */
    deleteWorkflowBatch: builder.mutation<void, string>({
      query: (id) => ({
        url: `/reseller-workflow/batches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Add product to batch
     */
    addProductToBatch: builder.mutation<
      WorkflowBatchProduct,
      { batchId: string; product: AddProductToBatchRequest }
    >({
      query: ({ batchId, product }) => ({
        url: `/reseller-workflow/batches/${batchId}/products`,
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Update batch product
     */
    updateBatchProduct: builder.mutation<
      WorkflowBatchProduct,
      { batchId: string; productId: string; data: UpdateBatchProductRequest }
    >({
      query: ({ batchId, productId, data }) => ({
        url: `/reseller-workflow/batches/${batchId}/products/${productId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Remove product from batch
     */
    removeProductFromBatch: builder.mutation<void, { batchId: string; productId: string }>({
      query: ({ batchId, productId }) => ({
        url: `/reseller-workflow/batches/${batchId}/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Update batch status
     */
    updateBatchStatus: builder.mutation<void, { id: string; status: WorkflowStatus }>({
      query: ({ id, status }) => ({
        url: `/reseller-workflow/batches/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['ResellerWorkflow'],
    }),

    /**
     * Create FBA shipment from batch
     */
    createFBAShipmentFromBatch: builder.mutation<
      FBAShipmentInfo,
      CreateFBAShipmentFromBatchRequest
    >({
      query: (body) => ({
        url: '/reseller-workflow/create-fba-shipment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ResellerWorkflow', 'InboundShipments'],
    }),

    /**
     * Generate FNSKU labels
     */
    generateFNSKULabels: builder.mutation<{ pdfUrl: string }, { batchId: string; productIds: string[] }>({
      query: ({ batchId, productIds }) => ({
        url: `/reseller-workflow/batches/${batchId}/generate-labels`,
        method: 'POST',
        body: { productIds },
      }),
    }),
  }),
})

export const {
  useGetWorkflowSummaryQuery,
  useGetWorkflowBatchesQuery,
  useGetWorkflowBatchQuery,
  useCreateWorkflowBatchMutation,
  useUpdateWorkflowBatchMutation,
  useDeleteWorkflowBatchMutation,
  useAddProductToBatchMutation,
  useUpdateBatchProductMutation,
  useRemoveProductFromBatchMutation,
  useUpdateBatchStatusMutation,
  useCreateFBAShipmentFromBatchMutation,
  useGenerateFNSKULabelsMutation,
} = resellerWorkflowApi
