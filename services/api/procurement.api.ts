import { baseApi } from './baseApi'
import type { Page, PageParams } from './finance.api'

interface Envelope<T> {
  success: boolean
  data: T
}

const unwrap = <T,>(response: Envelope<T>): T => response.data

/* ─────────────── Products ─────────────── */

export type WeightUnit = 'KG' | 'LB'
export type LengthUnit = 'CM' | 'IN'
export type ProductTag = 'PARENT' | 'VARIATION'

export interface CategoryRef {
  id: number
  name: string
}

/** One product row, master or variation. Measurements are canonical: kg, cm, m³; the unit fields say how they were entered. */
export interface PoProduct {
  id: number
  pid: string
  parentId: number | null
  tag: ProductTag
  name: string
  variantName: string | null
  sku: string
  color: string | null
  material: string | null
  packaging: string | null
  sizeName: string | null
  sizeValue: number | null
  sizeUnit: LengthUnit | null
  description: string | null
  category: CategoryRef | null
  weightKg: number | null
  weightUnit: WeightUnit
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  dimensionUnit: LengthUnit
  cbm: number | null
  inheritsMaster: boolean
  hasPhoto: boolean
  updatedAt: string
}

export interface PoProductListItem extends PoProduct {
  variationCount: number
  colorCount: number
  variations: PoProduct[]
}

export interface PoProductFamily extends PoProduct {
  variations: PoProduct[]
}

export interface ProductListParams extends PageParams {
  categoryId?: number
  color?: string
  tag?: 'ALL' | ProductTag
}

export interface ProductSummary {
  masters: number
  variations: number
  colors: string[]
}

/** Shipping fields as typed, in the units of their toggles. */
export interface ShippingInput {
  weight: number | null
  weightUnit: WeightUnit
  length: number | null
  width: number | null
  height: number | null
  dimensionUnit: LengthUnit
  cbm: number | null
}

interface VariantInput {
  material: string | null
  packaging: string | null
  sizeName: string | null
  sizeValue: number | null
  sizeUnit: LengthUnit | null
  description: string | null
}

export interface VariationBody extends VariantInput, ShippingInput {
  id?: number
  sku: string
  color: string
  inheritsMaster: boolean
  categoryId: number | null
}

export interface ProductBody extends VariantInput, ShippingInput {
  name: string
  sku: string
  categoryId: number | null
  color: string | null
  variations: VariationBody[]
  expectedUpdatedAt?: string
}

/* ─────────────── Purchase orders ─────────────── */

export type PoDestination = 'US' | 'CA'
export type PoCurrency = 'USD' | 'CAD'
export type PoStatus = 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'READY_TO_SHIP'
export type EtdAlertLevel = 'OVERDUE' | 'SOON' | 'OK' | 'NONE'
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

export interface EtdAlert {
  level: EtdAlertLevel
  daysLeft: number
}

export interface PoPayment {
  status: PaymentState
  paidPercent: number
  requestCount: number
}

export interface PurchaseOrderListItem {
  id: number
  poNo: string
  supplier: { id: number; name: string }
  destination: PoDestination
  currency: PoCurrency
  productionDate: string | null
  etd: string
  etdAlert: EtdAlert
  skuCount: number
  units: number
  packed: number
  status: PoStatus
  payment: PoPayment
  isOpen: boolean
  rejectionReason: string | null
  createdAt: string
}

export interface PurchaseOrderListParams extends PageParams {
  destinations?: PoDestination[]
  statuses?: PoStatus[]
  paymentStatuses?: PaymentState[]
  etdAlerts?: Array<Exclude<EtdAlertLevel, 'NONE'>>
  colors?: string[]
  etdFrom?: string
  etdTo?: string
  open?: 'ALL' | 'OPEN' | 'CLOSED'
}

export interface PoLine {
  id: number
  product: PoProduct
  unitsOrdered: number
  allocated: number
  remaining: number
}

export interface PoEvent {
  id: number
  type: string
  actor: { id: number; name: string | null } | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface SupplierRef {
  id: number
  name: string
  contactName: string | null
  country: string | null
  currency: string
}

export interface PurchaseOrderDetail {
  id: number
  poNo: string
  supplier: SupplierRef
  contactName: string | null
  destination: PoDestination
  currency: PoCurrency
  productionDate: string | null
  etd: string
  etdAlert: EtdAlert
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null; unit: LengthUnit }
  masterCartons: number | null
  status: PoStatus
  isOpen: boolean
  closedAt: string | null
  payment: PoPayment
  rejectionReason: string | null
  rejectedAt: string | null
  approvedAt: string | null
  decidedBy: { id: number; name: string | null } | null
  createdBy: { id: number; name: string | null }
  createdAt: string
  updatedAt: string
  source: { id: number; poNo: string } | null
  derived: Array<{ id: number; poNo: string }>
  lines: PoLine[]
  totals: { units: number; allocated: number }
  remainingForNewPo: number
  events: PoEvent[]
  can: { edit: boolean; decide: boolean; toggleOpen: boolean; createFromRemaining: boolean }
}

export interface PurchaseOrderBody {
  supplierId: number
  contactName: string | null
  destination: PoDestination
  currency: PoCurrency
  productionDate: string | null
  etd: string
  cartonLength: number | null
  cartonWidth: number | null
  cartonHeight: number | null
  cartonUnit: LengthUnit
  masterCartons: number | null
  lines: Array<{ productId: number; unitsOrdered: number }>
  sourcePurchaseOrderId?: number
  expectedUpdatedAt?: string
}

export interface RemainingDraft {
  sourcePurchaseOrderId: number
  sourcePoNo: string
  supplier: SupplierRef
  contactName: string | null
  destination: PoDestination
  currency: PoCurrency
  lines: Array<{ product: PoProduct; unitsOrdered: number }>
}

/** Supplier, product and SKU have no box of their own: the search covers them. */
export interface PoFilterOptions {
  colors: string[]
}

export interface SupplierOption extends SupplierRef {
  type: 'SUPPLIER' | 'VENDOR'
}

/** Arrays go to the API as comma-separated values; empty ones are left out. */
const csv = (values?: Array<string | number>) => (values && values.length ? values.join(',') : undefined)

export const procurementApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getPoProducts: b.query<Page<PoProductListItem>, ProductListParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/products', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementProducts'],
    }),
    getPoProductSummary: b.query<ProductSummary, void>({
      query: () => '/procurement/products/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementProducts'],
    }),
    getPoProduct: b.query<PoProductFamily, number>({
      query: (id) => `/procurement/products/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementProducts'],
    }),
    getPoProductOptions: b.query<PoProduct[], { search?: string; limit?: number }>({
      query: ({ search, limit }) => ({ url: '/procurement/products/options', params: { search: search || undefined, limit } }),
      transformResponse: unwrap,
      providesTags: ['ProcurementProducts'],
    }),
    checkPoProductSku: b.query<{ sku: string; available: boolean }, { sku: string; productId?: number }>({
      query: (params) => ({ url: '/procurement/products/sku-check', params }),
      transformResponse: unwrap,
    }),
    createPoProduct: b.mutation<PoProductFamily, ProductBody>({
      query: (body) => ({ url: '/procurement/products', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementProducts'],
    }),
    updatePoProduct: b.mutation<PoProductFamily, { id: number; body: ProductBody }>({
      query: ({ id, body }) => ({ url: `/procurement/products/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementProducts'],
    }),
    archivePoProduct: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/products/${id}/archive`, method: 'POST' }),
      invalidatesTags: ['ProcurementProducts'],
    }),
    uploadPoProductPhoto: b.mutation<void, { id: number; file: File }>({
      query: ({ id, file }) => {
        const body = new FormData()
        body.append('photo', file)
        return { url: `/procurement/products/${id}/photo`, method: 'PUT', body }
      },
      invalidatesTags: ['ProcurementProducts'],
    }),
    removePoProductPhoto: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/products/${id}/photo`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementProducts'],
    }),

    /* purchase orders */
    getPurchaseOrders: b.query<Page<PurchaseOrderListItem>, PurchaseOrderListParams>({
      query: ({ search, destinations, statuses, paymentStatuses, etdAlerts, colors, ...params }) => ({
        url: '/procurement/purchase-orders',
        params: {
          ...params,
          search: search || undefined,
          destinations: csv(destinations),
          statuses: csv(statuses),
          paymentStatuses: csv(paymentStatuses),
          etdAlerts: csv(etdAlerts),
          colors: csv(colors),
        },
      }),
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrderSummary: b.query<{ all: number; open: number; overdue: number }, void>({
      query: () => '/procurement/purchase-orders/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrderFilterOptions: b.query<PoFilterOptions, void>({
      query: () => '/procurement/purchase-orders/filter-options',
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrder: b.query<PurchaseOrderDetail, number>({
      query: (id) => `/procurement/purchase-orders/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrderRemaining: b.query<RemainingDraft, number>({
      query: (id) => `/procurement/purchase-orders/${id}/remaining`,
      transformResponse: unwrap,
    }),
    createPurchaseOrder: b.mutation<PurchaseOrderDetail, PurchaseOrderBody>({
      query: (body) => ({ url: '/procurement/purchase-orders', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    updatePurchaseOrder: b.mutation<PurchaseOrderDetail, { id: number; body: PurchaseOrderBody }>({
      query: ({ id, body }) => ({ url: `/procurement/purchase-orders/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    setPurchaseOrderOpen: b.mutation<PurchaseOrderDetail, { id: number; isOpen: boolean }>({
      query: ({ id, isOpen }) => ({ url: `/procurement/purchase-orders/${id}/open`, method: 'POST', body: { isOpen } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    approvePurchaseOrder: b.mutation<PurchaseOrderDetail, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}/approve`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    rejectPurchaseOrder: b.mutation<PurchaseOrderDetail, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/procurement/purchase-orders/${id}/reject`, method: 'POST', body: { reason } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    /** Tagged with the finance partners so a supplier added in another tab shows up (live via SSE). */
    getSupplierOptions: b.query<SupplierOption[], string | void>({
      query: (search) => ({ url: '/procurement/suppliers/options', params: { search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['FinancePartners'],
    }),

    /* categories */
    getPoCategories: b.query<CategoryRef[], void>({
      query: () => '/procurement/categories',
      transformResponse: unwrap,
      providesTags: ['ProcurementCategories'],
    }),
    createPoCategory: b.mutation<CategoryRef, string>({
      query: (name) => ({ url: '/procurement/categories', method: 'POST', body: { name } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementCategories'],
    }),
  }),
})

export const {
  useGetPoProductsQuery,
  useGetPoProductSummaryQuery,
  useGetPoProductQuery,
  useGetPoProductOptionsQuery,
  useLazyCheckPoProductSkuQuery,
  useCreatePoProductMutation,
  useUpdatePoProductMutation,
  useArchivePoProductMutation,
  useUploadPoProductPhotoMutation,
  useRemovePoProductPhotoMutation,
  useGetPoCategoriesQuery,
  useCreatePoCategoryMutation,
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderSummaryQuery,
  useGetPurchaseOrderFilterOptionsQuery,
  useGetPurchaseOrderQuery,
  useGetPurchaseOrderRemainingQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useSetPurchaseOrderOpenMutation,
  useApprovePurchaseOrderMutation,
  useRejectPurchaseOrderMutation,
  useGetSupplierOptionsQuery,
} = procurementApi
