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

/** A category as the manage screen lists it, with how many products use it. */
export interface PoCategory extends CategoryRef {
  isActive: boolean
  productCount: number
}

/** One product row, master or variation. Measurements are canonical: kg, cm, m³; the unit fields say how they were entered. */
export interface PoProduct {
  id: number
  pid: string
  parentId: number | null
  tag: ProductTag
  name: string
  variantName: string | null
  /** Optional; null when the product has none. */
  sku: string | null
  /** What to show wherever a product is listed: its SKU, else its product ID. */
  ref: string
  color: string | null
  material: string | null
  packaging: string | null
  /** Free text such as "Medium" or "750 ml". */
  sizeName: string | null
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

/** Weight as typed, in the unit of its toggle. */
export interface WeightInput {
  weight: number | null
  weightUnit: WeightUnit
}

/** L×W×H and CBM as typed, in the unit of its toggle (variations only). */
export interface DimensionInput {
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
  description: string | null
}

export interface VariationBody extends VariantInput, WeightInput, DimensionInput {
  id?: number
  /** Blank falls back to `Name-Color-Size`. */
  variantName: string | null
  sku: string | null
  color: string
  /** "Same weight as master". */
  inheritsMaster: boolean
}

/** A master has a weight but no dimensions; `dimensionUnit` is the unit its variations' dimensions are typed in. */
export interface ProductBody extends VariantInput, WeightInput, Pick<DimensionInput, 'dimensionUnit'> {
  name: string
  sku: string | null
  categoryId: number | null
  color: string | null
  variations: VariationBody[]
  expectedUpdatedAt?: string
}

/* ─────────────── Purchase orders ─────────────── */

export type PoDestination = 'US' | 'CA'
export type PoCurrency = 'USD' | 'CAD'
/** DRAFT (new, or sent back by a rejection) → PENDING_APPROVAL (submitted) → IN_PROGRESS (approved) → READY_TO_SHIP. */
export type PoStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'READY_TO_SHIP'
export type EtdAlertLevel = 'OVERDUE' | 'SOON' | 'OK' | 'NONE'
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

export interface EtdAlert {
  level: EtdAlertLevel
  daysLeft: number
  /** Every unit is in a container: no colour, no reminders. */
  shipped?: boolean
}

export interface PoPayment {
  status: PaymentState
  paidPercent: number
  requestCount: number
  /** Sum of the counted requests, and what has been paid on them. */
  requestedAmount: number
  paidAmount: number
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
  /** Sum of units x rate over the lines. */
  totalAmount: number
  packed: number
  status: PoStatus
  payment: PoPayment
  isOpen: boolean
  rejectionReason: string | null
  /** An approver unlocked this approved PO for editing. */
  unlocked: boolean
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
  /** Rate per unit in the PO's currency; null on lines saved before rates were captured. */
  unitPrice: number | null
  /** Units x rate. */
  amount: number
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
  totals: { units: number; allocated: number; amount: number }
  remainingForNewPo: number
  events: PoEvent[]
  /** Set while an approver has unlocked this approved PO for editing; the next save locks it again. */
  unlockedAt: string | null
  unlockedBy: { id: number; name: string | null } | null
  can: { edit: boolean; submit: boolean; delete: boolean; decide: boolean; unlock: boolean; lock: boolean; toggleOpen: boolean; createFromRemaining: boolean }
}

export interface PurchaseOrderBody {
  /** Send for approval with this save (drafts only). */
  submit?: boolean
  supplierId: number
  contactName: string | null
  destination: PoDestination
  currency: PoCurrency
  productionDate: string | null
  etd: string
  lines: Array<{ productId: number; unitsOrdered: number; unitPrice: number }>
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
  lines: Array<{ product: PoProduct; unitsOrdered: number; unitPrice: number | null }>
}

/** Supplier, product and SKU have no box of their own: the search covers them. */
export interface PoFilterOptions {
  colors: string[]
}

export interface SupplierOption extends SupplierRef {
  type: 'SUPPLIER' | 'VENDOR'
}

/* ─────────────── Packaging lists ─────────────── */

export interface PackagingListItem {
  id: number
  plNo: string
  /** The suppliers of its purchase orders (a list may span several). */
  suppliers: Array<{ id: number; name: string }>
  destination: PoDestination
  purchaseOrders: Array<{ id: number; poNo: string }>
  skuCount: number
  units: number
  cartons: number
  cbm: number
  netWeightKg: number
  grossWeightKg: number
  /** The container carrying this list, if any. */
  container: ContainerRef | null
  createdAt: string
}

export type ContainerFilter = 'ALL' | 'ASSIGNED' | 'NONE'

export interface PackagingListParams extends PageParams {
  purchaseOrderId?: number
  container?: ContainerFilter
  destination?: PoDestination
}

export interface PackagingLineDetail {
  id: number
  purchaseOrderId: number
  poNo: string
  product: PoProduct
  poQty: number
  /** Units of this PO line on other lists. */
  allocatedElsewhere: number
  available: number
  units: number
  cartons: number
  /** Outer carton size typed on the line, in cm; null on lines saved before cartons were recorded. */
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null; unit: LengthUnit }
  cbm: number
  netWeightKg: number
  grossWeightKg: number
}

export interface PackagingListDetail {
  id: number
  plNo: string
  suppliers: Array<{ id: number; name: string }>
  destination: PoDestination
  createdBy: { id: number; name: string | null }
  createdAt: string
  updatedAt: string
  purchaseOrders: Array<{ id: number; poNo: string }>
  container: ContainerRef | null
  lines: PackagingLineDetail[]
  totals: { skuCount: number; units: number; cartons: number; cbm: number; netWeightKg: number; grossWeightKg: number }
}

/** A PO for the list form (any supplier), with what decides whether it can be picked. */
export interface PackablePurchaseOrder {
  id: number
  poNo: string
  supplier: { id: number; name: string }
  destination: PoDestination
  currency: PoCurrency
  status: PoStatus
  isOpen: boolean
  units: number
  /** Other packaging lists this PO is already on. */
  listCount: number
}

export interface PackablePoLines {
  /** `price` is the PO's total (units x rate) in its currency; null when no rate has been entered yet. */
  purchaseOrder: { id: number; poNo: string; currency: PoCurrency; destination: PoDestination; supplier: { id: number; name: string }; price: number | null }
  lines: Array<{ product: PoProduct; poQty: number; allocated: number; available: number }>
}

export interface PackagingLineBody {
  purchaseOrderId: number
  productId: number
  units: number
  cartons: number
  /** Outer carton L x W x H in `cartonUnit`; CBM is cartons x this volume. */
  cartonLength: number | null
  cartonWidth: number | null
  cartonHeight: number | null
  cartonUnit: LengthUnit
  grossWeightKg: number
}

export interface PackagingListBody {
  purchaseOrderIds: number[]
  lines: PackagingLineBody[]
  closePurchaseOrderIds: number[]
  expectedUpdatedAt?: string
}

/* ─────────────── Containers ─────────────── */

/** BOOKED: fully editable · IN_TRANSIT: only the ETA can change · DELIVERED: nothing can change. */
export type ContainerStatus = 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED'

/** Container form fields a status may lock. */
export type ContainerField =
  | 'containerNumber'
  | 'billOfLading'
  | 'masterBillOfLading'
  | 'etd'
  | 'eta'
  | 'destination'
  | 'destinationCity'
  | 'destinationProvince'
  | 'portOfArrival'
  | 'totalCost'
  | 'currency'

/** What the container's status allows; the server enforces the same rules. */
export interface ContainerPermissions {
  editableFields: ContainerField[]
  canChangeList: boolean
  canUpload: boolean
  canChangeStatus: boolean
}

export interface ContainerRef {
  id: number
  containerNo: string
  containerNumber: string | null
  status: ContainerStatus
}

export interface ContainerLine {
  purchaseOrderId: number
  poNo: string
  sku: string
  name: string
  color: string | null
  sizeName: string | null
  /** Ordered on the PO, for "ordered vs. in this container". */
  ordered: number
  units: number
  cartons: number
  /** Carton size saved on the packaging list, in cm. */
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null }
  cbm: number
  netWeightKg: number
  grossWeightKg: number
}

export interface ContainerItem {
  id: number
  /** Our reference, CID#…. */
  containerNo: string
  /** The shipping line's container number, e.g. MSKU1234567. */
  containerNumber: string | null
  billOfLading: string | null
  masterBillOfLading: string | null
  status: ContainerStatus
  etd: string | null
  eta: string | null
  destination: PoDestination
  destinationCity: string | null
  destinationProvince: string | null
  portOfArrival: string | null
  totalCost: number | null
  currency: PoCurrency
  deliveredAt: string | null
  updatedAt: string
  permissions: ContainerPermissions
  packagingList: { id: number; plNo: string; suppliers: Array<{ id: number; name: string }>; purchaseOrders: Array<{ id: number; poNo: string }> } | null
  totals: { units: number; cartons: number; cbm: number; netWeightKg: number; grossWeightKg: number }
  lines: ContainerLine[]
}

/** A payment request whose "Container No" is this container's number. */
export interface ContainerPayment {
  id: number
  requestNo: string
  invoiceNo: string | null
  partner: { id: number; name: string }
  invoiceDate: string
  currency: string
  amount: number
  paidAmount: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  paymentStatus: 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'POP_UPLOADED' | 'PAID' | null
}

export interface ContainerDocument {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  uploadedBy: { id: number; name: string | null }
}

/** A purchase order shipped in the container: its price and what has been paid on it. */
export interface ContainerPurchaseOrder {
  id: number
  poNo: string
  supplier: { id: number; name: string } | null
  /** `amount` is null when the PO has no rates yet. */
  price: { currency: string; amount: number | null; units: number } | null
  payment: PoPayment
  /** Units of this PO in this container. */
  units: number
}

export interface ContainerDetail extends ContainerItem {
  purchaseOrders: ContainerPurchaseOrder[]
  payments: ContainerPayment[]
  documents: ContainerDocument[]
}

export interface ContainerParams extends PageParams {
  status?: ContainerStatus
  destination?: PoDestination
}

export interface ContainerBody {
  containerNumber: string | null
  billOfLading: string | null
  masterBillOfLading: string | null
  status: ContainerStatus
  etd: string | null
  eta: string | null
  destination: PoDestination
  destinationCity: string | null
  destinationProvince: string | null
  portOfArrival: string | null
  totalCost: number | null
  currency: PoCurrency
  expectedUpdatedAt?: string
}

/** An empty container a list can go into. */
export interface AssignableContainer {
  id: number
  containerNo: string
  containerNumber: string | null
  destination: PoDestination
  etd: string | null
  billOfLading: string | null
  status: ContainerStatus
}

/* ─────────────── Price analysis ─────────────── */

/** The analysed product's own details (read-only on the price analysis screen). */
export type PriceAnalysisProduct = Pick<
  PoProduct,
  | 'id'
  | 'pid'
  | 'sku'
  | 'ref'
  | 'name'
  | 'variantName'
  | 'color'
  | 'material'
  | 'packaging'
  | 'sizeName'
  | 'weightKg'
  | 'weightUnit'
  | 'lengthCm'
  | 'widthCm'
  | 'heightCm'
  | 'dimensionUnit'
  | 'cbm'
  | 'hasPhoto'
  | 'updatedAt'
>

export interface PriceQuote {
  supplier: { id: number; name: string; contactName: string | null; isActive: boolean }
  contactName: string | null
  remarks: string | null
  unitPrice: number
  /** This is the one approved quote. */
  approved: boolean
  /** Turned down by an approver, with the reason; cleared when the analysis is edited. */
  rejection: { by: { id: number; name: string | null }; at: string; reason: string | null } | null
  /** 1 = cheapest; equal prices keep row order. */
  rank: number
  vsLowestPercent: number
}

export interface PriceAnalysis {
  id: number
  material: string | null
  currency: PoCurrency
  updatedAt: string
  updatedBy: { id: number; name: string | null }
  quotes: PriceQuote[]
  /** The approved quote; null until an approver picks one, and again after an edit. */
  approval: { supplier: { id: number; name: string }; unitPrice: number; remarks: string | null; by: { id: number; name: string | null }; at: string } | null
}

/** One line of an analysis's approval history: an approval, or an edit that took it back. */
export interface PriceAnalysisEvent {
  id: number
  type: 'APPROVED' | 'REJECTED' | 'APPROVAL_CLEARED'
  supplierName: string | null
  unitPrice: number | null
  currency: string | null
  remarks: string | null
  by: { id: number; name: string | null }
  at: string
}

export interface PriceAnalysisView {
  product: PriceAnalysisProduct
  analysis: PriceAnalysis | null
  /** Newest first. */
  history: PriceAnalysisEvent[]
  permissions: { canApprove: boolean; canReject: boolean }
}

/** NONE: no quotes yet · PENDING: quoted, waiting for approval · APPROVED: one quote approved. */
export type PriceAnalysisStatus = 'NONE' | 'PENDING' | 'APPROVED'

export interface PriceAnalysisListItem {
  product: PriceAnalysisProduct & { category: CategoryRef | null }
  status: PriceAnalysisStatus
  currency: PoCurrency | null
  supplierCount: number
  lowest: { supplier: string; unitPrice: number } | null
  approval: { supplier: { id: number; name: string }; unitPrice: number; by: { id: number; name: string | null }; at: string } | null
  updatedAt: string | null
  updatedBy: { id: number; name: string | null } | null
}

export interface PriceAnalysisListParams extends PageParams {
  status?: 'ALL' | PriceAnalysisStatus
  categoryId?: number
}

export interface PriceAnalysisBody {
  material: string | null
  currency: PoCurrency
  quotes: Array<{ supplierId: number; contactName: string | null; remarks: string | null; unitPrice: number }>
  /** When the analysis was loaded; `null` = there was none yet. */
  expectedUpdatedAt: string | null
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
    getProcurementPurchaseOrders: b.query<Page<PurchaseOrderListItem>, PurchaseOrderListParams>({
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
    getProcurementPurchaseOrderSummary: b.query<{ all: number; open: number; overdue: number }, void>({
      query: () => '/procurement/purchase-orders/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrderFilterOptions: b.query<PoFilterOptions, void>({
      query: () => '/procurement/purchase-orders/filter-options',
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getProcurementPurchaseOrder: b.query<PurchaseOrderDetail, number>({
      query: (id) => `/procurement/purchase-orders/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    getPurchaseOrderRemaining: b.query<RemainingDraft, number>({
      query: (id) => `/procurement/purchase-orders/${id}/remaining`,
      transformResponse: unwrap,
    }),
    createProcurementPurchaseOrder: b.mutation<PurchaseOrderDetail, PurchaseOrderBody>({
      query: (body) => ({ url: '/procurement/purchase-orders', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    updateProcurementPurchaseOrder: b.mutation<PurchaseOrderDetail, { id: number; body: PurchaseOrderBody }>({
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
    submitPurchaseOrder: b.mutation<PurchaseOrderDetail, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}/submit`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    deletePurchaseOrder: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    setPurchaseOrderLocked: b.mutation<PurchaseOrderDetail, { id: number; locked: boolean }>({
      query: ({ id, locked }) => ({ url: `/procurement/purchase-orders/${id}/${locked ? 'lock' : 'unlock'}`, method: 'POST' }),
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

    /* packaging lists */
    getPackagingLists: b.query<Page<PackagingListItem>, PackagingListParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/packaging-lists', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementPackagingLists', 'ProcurementContainers'],
    }),
    getPackagingListSummary: b.query<{ all: number; withoutContainer: number }, void>({
      query: () => '/procurement/packaging-lists/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists'],
    }),
    getPackagingList: b.query<PackagingListDetail, number>({
      query: (id) => `/procurement/packaging-lists/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists'],
    }),
    getPackablePurchaseOrders: b.query<PackablePurchaseOrder[], { excludeListId?: number }>({
      query: (params) => ({ url: '/procurement/packaging-lists/po-options', params }),
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    getPackablePoLines: b.query<PackablePoLines[], { purchaseOrderIds: number[]; excludeListId?: number }>({
      query: ({ purchaseOrderIds, excludeListId }) => ({ url: '/procurement/packaging-lists/po-lines', params: { purchaseOrderIds: csv(purchaseOrderIds), excludeListId } }),
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    createPackagingList: b.mutation<PackagingListDetail, PackagingListBody>({
      query: (body) => ({ url: '/procurement/packaging-lists', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    updatePackagingList: b.mutation<PackagingListDetail, { id: number; body: PackagingListBody }>({
      query: ({ id, body }) => ({ url: `/procurement/packaging-lists/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    deletePackagingList: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/packaging-lists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),

    /* containers */
    getContainers: b.query<Page<ContainerItem>, ContainerParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/containers', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementContainers'],
    }),
    getContainerSummary: b.query<{ all: number; empty: number }, void>({
      query: () => '/procurement/containers/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    getContainer: b.query<ContainerItem, number>({
      query: (id) => `/procurement/containers/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    getContainerDetail: b.query<ContainerDetail, number>({
      query: (id) => `/procurement/containers/${id}/detail`,
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers', 'FinanceRequests'],
    }),
    uploadContainerDocuments: b.mutation<ContainerDocument[], { id: number; files: File[] }>({
      query: ({ id, files }) => {
        const body = new FormData()
        for (const file of files) body.append('documents', file)
        return { url: `/procurement/containers/${id}/documents`, method: 'POST', body }
      },
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
    }),
    getContainerPorts: b.query<string[], PoDestination>({
      query: (destination) => ({ url: '/procurement/containers/ports', params: { destination } }),
      transformResponse: unwrap,
    }),
    getAssignableContainers: b.query<AssignableContainer[], { destination: PoDestination; includeId?: number }>({
      query: (params) => ({ url: '/procurement/containers/assignable', params }),
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    createContainer: b.mutation<ContainerItem, ContainerBody>({
      query: (body) => ({ url: '/procurement/containers', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    updateContainer: b.mutation<ContainerItem, { id: number; body: ContainerBody }>({
      query: ({ id, body }) => ({ url: `/procurement/containers/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    setContainerPackagingList: b.mutation<ContainerItem, { id: number; packagingListId: number | null }>({
      query: ({ id, packagingListId }) => ({ url: `/procurement/containers/${id}/packaging-list`, method: 'PUT', body: { packagingListId } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    markContainerDelivered: b.mutation<ContainerItem, number>({
      query: (id) => ({ url: `/procurement/containers/${id}/delivered`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
    }),

    /* price analysis */
    getPriceAnalyses: b.query<Page<PriceAnalysisListItem>, PriceAnalysisListParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/price-analysis', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementPriceAnalysis'],
    }),
    approvePriceAnalysis: b.mutation<PriceAnalysisView, { productId: number; supplierId: number; expectedUpdatedAt?: string }>({
      query: ({ productId, ...body }) => ({ url: `/procurement/price-analysis/${productId}/approve`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    rejectPriceAnalysisQuote: b.mutation<PriceAnalysisView, { productId: number; supplierId: number; reason: string; expectedUpdatedAt?: string }>({
      query: ({ productId, ...body }) => ({ url: `/procurement/price-analysis/${productId}/reject`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    getPriceAnalysis: b.query<PriceAnalysisView, number>({
      query: (productId) => `/procurement/price-analysis/${productId}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPriceAnalysis'],
    }),
    savePriceAnalysis: b.mutation<PriceAnalysisView, { productId: number; body: PriceAnalysisBody }>({
      query: ({ productId, body }) => ({ url: `/procurement/price-analysis/${productId}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),

    /* categories */
    getPoCategories: b.query<PoCategory[], { includeInactive?: boolean } | void>({
      query: (params) => ({ url: '/procurement/categories', params: params?.includeInactive ? { includeInactive: 'true' } : undefined }),
      transformResponse: unwrap,
      providesTags: ['ProcurementCategories'],
    }),
    createPoCategory: b.mutation<CategoryRef, string>({
      query: (name) => ({ url: '/procurement/categories', method: 'POST', body: { name } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementCategories'],
    }),
    updatePoCategory: b.mutation<CategoryRef, { id: number; patch: Partial<Pick<PoCategory, 'name' | 'isActive'>> }>({
      query: ({ id, patch }) => ({ url: `/procurement/categories/${id}`, method: 'PATCH', body: patch }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementCategories', 'ProcurementProducts'],
    }),
    deletePoCategory: b.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/procurement/categories/${id}`, method: 'DELETE' }),
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
  useUpdatePoCategoryMutation,
  useDeletePoCategoryMutation,
  useGetProcurementPurchaseOrdersQuery,
  useGetProcurementPurchaseOrderSummaryQuery,
  useGetPurchaseOrderFilterOptionsQuery,
  useGetProcurementPurchaseOrderQuery,
  useGetPurchaseOrderRemainingQuery,
  useCreateProcurementPurchaseOrderMutation,
  useUpdateProcurementPurchaseOrderMutation,
  useSetPurchaseOrderOpenMutation,
  useApprovePurchaseOrderMutation,
  useRejectPurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useSetPurchaseOrderLockedMutation,
  useGetSupplierOptionsQuery,
  useGetPackagingListsQuery,
  useGetPackagingListSummaryQuery,
  useGetPackagingListQuery,
  useGetPackablePurchaseOrdersQuery,
  useGetPackablePoLinesQuery,
  useCreatePackagingListMutation,
  useUpdatePackagingListMutation,
  useDeletePackagingListMutation,
  useGetContainersQuery,
  useGetContainerSummaryQuery,
  useGetContainerQuery,
  useGetContainerDetailQuery,
  useUploadContainerDocumentsMutation,
  useGetContainerPortsQuery,
  useGetAssignableContainersQuery,
  useCreateContainerMutation,
  useUpdateContainerMutation,
  useSetContainerPackagingListMutation,
  useMarkContainerDeliveredMutation,
  useGetPriceAnalysesQuery,
  useApprovePriceAnalysisMutation,
  useRejectPriceAnalysisQuoteMutation,
  useGetPriceAnalysisQuery,
  useSavePriceAnalysisMutation,
} = procurementApi
