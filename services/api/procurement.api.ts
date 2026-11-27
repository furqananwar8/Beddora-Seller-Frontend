import { baseApi } from './baseApi'
import type { CostCenterOption, FinanceDocument, Page, PageParams, PartnerType, UserRef } from './finance.api'

interface Envelope<T> {
  success: boolean
  data: T
}

export interface NotifiedPerson {
  id: number
  name: string
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
/** The platform a product is sold on: Ecommerce is Beddora, Retail is Northern Linen. */
export type ProductPlatform = 'ECOMMERCE' | 'RETAIL'

export interface PoProduct {
  id: number
  pid: string
  parentId: number | null
  tag: ProductTag
  name: string
  /** Chosen per variation; a master without variations has its own. */
  platform: ProductPlatform
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
  /** Variations only: the product's own dimensions as typed, apart from the packed ones. */
  productDimensions: string | null
  /** Customs tariff code; a variation starts from its master's and may differ per SKU. */
  hsCode: string | null
  description: string | null
  category: CategoryRef | null
  weightKg: number | null
  weightUnit: WeightUnit
  /** The individually packed unit's L × W × H. */
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  /** The dimensions the supplier states for the product (variations only). */
  supplierLengthCm: number | null
  supplierWidthCm: number | null
  supplierHeightCm: number | null
  dimensionUnit: LengthUnit
  cbm: number | null
  /** Variations only: the barcode, null when none was given. */
  upc: string | null
  /** Variations only: the Amazon listing's ASIN, null when none was given. */
  asin: string | null
  /** Variations only: the stock level (units) at which to reorder. */
  reorderPoint: number | null
  /** Variations only: units in one master carton. */
  unitsPerCarton: number | null
  /** Variations only: the marketplace of the first SKU (CA, US, MX). */
  marketplace: string | null
  /** Variations only: every SKU with its marketplace; several marketplaces, several SKUs in each (a SKU is null until known). */
  skus: Array<{ marketplace: string; sku: string | null }>
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
  /** Marketplace codes (CA, US, MX); leave out for every marketplace. */
  marketplace?: string[]
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
  supplierLength: number | null
  supplierWidth: number | null
  supplierHeight: number | null
  dimensionUnit: LengthUnit
  cbm: number | null
}

interface VariantInput {
  material: string | null
  packaging: string | null
  sizeName: string | null
  hsCode: string | null
  description: string | null
}

export interface VariationBody extends VariantInput, WeightInput, DimensionInput {
  id?: number
  /** Blank falls back to `Name-Color-Size`. */
  variantName: string | null
  platform: ProductPlatform
  /** The product's own dimensions as typed (free text). */
  productDimensions: string | null
  sku: string | null
  /** Optional UPC barcode. */
  upc: string | null
  /** Optional Amazon ASIN. */
  asin: string | null
  /** Optional stock level (units) at which to reorder. */
  reorderPoint: number | null
  /** Units in one master carton: a whole number, 0 or more. */
  unitsPerCarton: number | null
  /** The marketplace of the first SKU: CA, US or MX. Sent for older servers; `skus` is the full list. */
  marketplace: string | null
  /** Every SKU of the variation, each for one marketplace. */
  skus: Array<{ marketplace: string; sku: string | null }>
  color: string
  /** "Same weight as master". */
  inheritsMaster: boolean
}

/** A master has a weight but no dimensions; `dimensionUnit` is the unit its variations' dimensions are typed in. */
export interface ProductBody extends VariantInput, WeightInput, Pick<DimensionInput, 'dimensionUnit'> {
  name: string
  /** Only meaningful without variations; each variation carries its own. */
  platform: ProductPlatform
  sku: string | null
  categoryId: number | null
  color: string | null
  variations: VariationBody[]
  expectedUpdatedAt?: string
}

/* ─────────────── Purchase orders ─────────────── */

export type PoDestination = 'US' | 'CA'
export type PoCurrency = 'USD' | 'CAD'
/** DRAFT (new, or sent back by a rejection) → PENDING_APPROVAL (submitted) → APPROVED → IN_PROGRESS (production date set, shown as IN PRODUCTION) → READY_TO_SHIP (set by hand from the actions menu) → PARTIALLY_PACKED → FULLY_PACKED → PARTIALLY_SHIPPED → FULLY_SHIPPED; SHORT_CLOSED when closed before every unit was packed. */
export type PoStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'READY_TO_SHIP'
  | 'PARTIALLY_PACKED'
  | 'FULLY_PACKED'
  | 'SHORT_CLOSED'
  | 'PARTIALLY_SHIPPED'
  | 'FULLY_SHIPPED'
  | 'RECEIVED'
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
  /** The PO number from another system (the legacy sheet), when the PO came from there. */
  externalRef: string | null
  supplier: { id: number; name: string }
  destination: PoDestination
  /** The brand the PO is for. */
  platform: ProductPlatform
  currency: PoCurrency
  productionDate: string | null
  /** The date the PO was issued to the supplier. */
  issuanceDate: string | null
  etd: string
  /** ARD: actual ready date, set from the list. */
  ard: string | null
  etdAlert: EtdAlert
  skuCount: number
  units: number
  /** Sum of units x rate over the lines. */
  totalAmount: number
  packed: number
  /** Packaging lists carrying this PO's units. */
  packagingListCount: number
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
  /** Units still to be put on a packaging list. */
  remaining: number
  /** Units in a container. */
  shipped: number
  /** Every ordered unit is in a container. */
  shippedFully: boolean
}

/** Where a sample stands; derived from its payment requests. FREE needs no payment. */
export type SampleStatus = 'FREE' | 'UNPAID' | 'REQUESTED' | 'PAID'

/** Units a supplier sends as samples: never packed or shipped; a chargeable one on the PO is added to the PO amount. */
export interface PoSample {
  id: number
  product: PoProduct
  units: number
  /** 0 for a free sample. */
  unitPrice: number
  amount: number
  isFree: boolean
  /** On a payment request: cannot be edited or removed. */
  locked: boolean
  status: SampleStatus
  requestId: number | null
  requestedAt: string | null
  paidAt: string | null
  /** When it was added to the SKU's Samples section. */
  inventoryAt: string | null
  /** Made on this PO form; one linked from the Samples screen is only unlinked when removed. */
  createdInPo: boolean
  /** Its amount is part of the PO's price. */
  inPoPrice: boolean
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

/** One step of a PO's approval chain: who decided, who is next, who is still to come. */
export interface PoApprovalStep {
  position: number
  completion: 'ANY' | 'ALL' | 'PER_GROUP'
  state: 'DONE' | 'CURRENT' | 'WAITING' | 'REJECTED'
  /** Who the step goes to, as the rule names them (shown before the step opens). */
  labels: string[]
  people: Array<{ userId: number; name: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; note: string | null; decidedAt: string | null }>
}

export interface PoApproval {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  currentPosition: number
  steps: PoApprovalStep[]
  /** The viewer holds a pending task in the current step. */
  canDecide: boolean
}

export type PoBatchStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'IN_PRODUCTION' | 'PACKED' | 'SHIPPED' | 'RECEIVED'

/** A production run of a PO: its own SKUs and units, production date and status (derived from the PO and its packaging list). */
export interface PoBatch {
  id: number
  seq: number
  label: string
  productionDate: string | null
  status: PoBatchStatus
  units: number
  /** Units on the batch's packaging list. */
  packed: number
  packagingList: { id: number; plNo: string; kind: PackagingListKind; container: ContainerRef | null } | null
  lines: Array<{ id: number; product: PoProduct; units: number; unitPrice: number | null; packed: number; remaining: number }>
}

export interface AddBatchBody {
  productionDate?: string
  lines: Array<{ productId: number; units: number }>
}

export interface PurchaseOrderDetail {
  id: number
  /** The brand the PO is for: every product, batch and packaging list of it is of this platform. */
  platform: ProductPlatform
  advancePercent: number
  balanceTerm: string
  balancePercent: number
  poNo: string
  /** The PO number from another system (the legacy sheet), when the PO came from there. */
  externalRef: string | null
  supplier: SupplierRef
  contactName: string | null
  /** Payment terms typed on this PO; printed on its PDF instead of the standard terms. */
  paymentTerms: string | null
  destination: PoDestination
  /** Where the goods are delivered; null when none was picked. */
  warehouse: PoWarehouse | null
  currency: PoCurrency
  productionDate: string | null
  /** The date the PO was issued to the supplier. */
  issuanceDate: string | null
  /** ERD: estimated ready date. */
  etd: string
  /** ARD: actual ready date, once the goods are ready. */
  ard: string | null
  etdAlert: EtdAlert
  status: PoStatus
  isOpen: boolean
  closedAt: string | null
  /** When the goods were marked Ready to ship; null before that. */
  readyToShipAt: string | null
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
  batches: PoBatch[]
  /** SKUs of the approved PO that no batch holds yet (what a short packaging list left): the most a new batch may take. */
  unbatched: Array<{ product: PoProduct; units: number }>
  samples: PoSample[]
  sampleTotals: { units: number; chargeableAmount: number }
  /** `amount` is the lines plus the samples that ride with the PO; `linesAmount` is the lines alone. */
  totals: { units: number; allocated: number; remaining: number; amount: number; linesAmount: number }
  remainingForNewPo: number
  events: PoEvent[]
  /** The approval chain of the latest submission; null when it never had one. */
  approval: PoApproval | null
  /** Set while an approver has unlocked this approved PO for editing; the next save locks it again. */
  unlockedAt: string | null
  unlockedBy: { id: number; name: string | null } | null
  can: { edit: boolean; addBatch: boolean; setProductionDate: boolean; setArd: boolean; markReadyToShip: boolean; submit: boolean; delete: boolean; decide: boolean; unlock: boolean; lock: boolean; toggleOpen: boolean; createFromRemaining: boolean }
}

export interface PurchaseOrderBody {
  /** Send for approval with this save (drafts only). */
  submit?: boolean
  supplierId: number
  contactName: string | null
  paymentTerms: string | null
  destination: PoDestination
  /** Ecommerce or Retail; its products must all be of this platform. */
  platform: ProductPlatform
  /** Payment terms: an advance, and the rest due on `balanceTerm`; the two add up to 100. */
  advancePercent: number
  balanceTerm: string
  balancePercent: number
  /** The warehouse the goods go to; null leaves it unset. */
  warehouseId: number | null
  currency: PoCurrency
  etd: string
  /** The PO's batches; each has its own products. `id` is a saved batch being edited. */
  batches: Array<{ id?: number; lines: Array<{ productId: number; unitsOrdered: number; unitPrice: number }> }>
  /** Samples on the PO: an `id` links an existing sample, none creates a new one; a unit price of 0 means free. */
  samples: Array<{ id?: number; productId: number; units: number; unitPrice: number }>
  sourcePurchaseOrderId?: number
  expectedUpdatedAt?: string
}

export interface RemainingDraft {
  sourcePurchaseOrderId: number
  sourcePoNo: string
  supplier: SupplierRef
  contactName: string | null
  destination: PoDestination
  platform: ProductPlatform
  currency: PoCurrency
  lines: Array<{ product: PoProduct; unitsOrdered: number; unitPrice: number | null }>
}

/** The line of the most recently created PO that had a product (any status), for the PO form's Last Purchase Price column. */
export interface PoLastPurchase {
  productId: number
  unitPrice: number | null
  currency: string
  purchaseDate: string
  purchaseOrderId: number
  poNo: string
}

/** Supplier, product and SKU have no box of their own: the search covers them. */
export interface PoFilterOptions {
  colors: string[]
}

export interface SupplierOption extends SupplierRef {
  type: 'SUPPLIER' | 'VENDOR'
}

/* ─────────────── Purchase invoices ─────────────── */

/** DRAFT / REJECTED → PENDING_APPROVAL → PAYMENT_PENDING → PARTIALLY_PAID → PAID (the paid states follow the PO's payments). */
export type PurchaseInvoiceStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'REJECTED' | 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'PAID'
/** The PDF renders in the background after every change. */
export type PurchaseInvoicePdfStatus = 'PENDING' | 'READY' | 'FAILED'

export interface PurchaseInvoiceCan {
  edit: boolean
  submit: boolean
  withdraw: boolean
  decide: boolean
}

export interface PurchaseInvoiceListItem {
  id: number
  /** Our number, `INV#2411`. */
  invoiceRef: string
  /** The supplier's invoice number. */
  invoiceNo: string
  invoiceDate: string
  purchaseOrder: { id: number; poNo: string }
  marketplaceId: number | null
  currency: string
  amount: number
  /** Payment requests raised against this invoice that count (submitted, not turned down or cancelled). */
  paymentRequestCount: number
  remarks: string | null
  status: PurchaseInvoiceStatus
  pdfStatus: PurchaseInvoicePdfStatus
  decisionNote: string | null
  createdAt: string
  partner: { id: number; name: string }
  /** Display name of what it is booked to: the L4 cost center's path (or, on older invoices, the expense type). */
  expenseType: { id: number; name: string }
  costCenter: CostCenterOption | null
  createdBy: UserRef
  decidedBy: UserRef | null
  can: PurchaseInvoiceCan
}

export interface PurchaseInvoiceListParams extends PageParams {
  statuses?: PurchaseInvoiceStatus[]
  purchaseOrderId?: number
}

/** A document on the invoice; `carried` ones come from the PO's payment requests and are only unlinked on removal. */
export interface PurchaseInvoiceDocument extends FinanceDocument {
  carried: boolean
}

/** One PO SKU on the invoice: what the PO ordered (snapshot) next to what the supplier invoiced. */
export interface PurchaseInvoiceLine {
  id: number
  product: { id: number; pid: string; ref: string; label: string; sku: string | null; name: string; variantName: string | null }
  po: { units: number; unitPrice: number; amount: number }
  units: number
  unitPrice: number
  amount: number
  /** The expense (L4 cost center) the item is booked to; null on invoices raised before per-item booking. */
  costCenter: CostCenterOption | null
}

export interface PurchaseInvoiceExpense {
  id: number
  name: string
  remarks: string | null
  amount: number
  costCenter: CostCenterOption | null
}

export interface PurchaseInvoiceDetail extends Omit<PurchaseInvoiceListItem, 'partner' | 'can'> {
  lines: PurchaseInvoiceLine[]
  expenses: PurchaseInvoiceExpense[]
  /** The PO's packaging lists (tentative and final), with per-SKU units. */
  packagingLists: PoPackagingListSummary[]
  /** `amount` = invoice + expenses. */
  totals: { po: number; invoice: number; expenses: number; amount: number }
  /** What its payment requests have paid so far. */
  payment: {
    paid: number
    remaining: number
    requests: Array<{ id: number; requestNo: string; status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; amount: number; paidAmount: number; paymentStatus: string | null }>
  }
  partner: { id: number; name: string; type: PartnerType; country: string | null; currency: string }
  marketplace: { id: number; name: string; code: string } | null
  documents: PurchaseInvoiceDocument[]
  events: Array<{ id: number; type: string; actor: UserRef | null; payload: Record<string, unknown> | null; createdAt: string }>
  /** The approval chain of its latest submission (who approves, in which order); null when it never had one. */
  approval: PoApproval | null
  can: PurchaseInvoiceCan
}

/** JSON body for edits; creation sends the same fields (plus the PO and files) as multipart form data. */
export interface PurchaseInvoiceBody {
  partnerId: number
  invoiceNo: string
  invoiceDate: string
  marketplaceId: number | null
  currency: string
  remarks: string | null
  /** The invoice amount is worked out from these on the server; each row is booked to its own expense. */
  lines: Array<{ productId: number; units: number; unitPrice: number; costCenterId: number }>
  expenses: Array<{ name: string; remarks: string | null; amount: number; costCenterId: number }>
  carriedDocumentIds: string[]
}

/** Where an invoice's stored files are served (readable by anyone who can see the invoice). */
export const purchaseInvoiceDocumentPath = (invoiceId: number, documentId: string): string =>
  `/procurement/purchase-invoices/${invoiceId}/documents/${documentId}/download`

export const purchaseInvoicePdfPath = (invoiceId: number): string => `/procurement/purchase-invoices/${invoiceId}/pdf`

/* ─────────────── Packaging lists ─────────────── */

/** TENTATIVE: drafted from a Ready to ship PO. FINAL: converted (units confirmed); only these go in containers. */
export type PackagingListKind = 'TENTATIVE' | 'FINAL'

export interface PackagingListItem {
  id: number
  plNo: string
  kind: PackagingListKind
  finalizedAt: string | null
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
  kind?: PackagingListKind
}

export interface PackagingLineDetail {
  id: number
  purchaseOrderId: number
  poNo: string
  batchId: number
  batchNo: string
  batchProductionDate: string | null
  product: PoProduct
  /** Units of this SKU in the batch. */
  poQty: number
  /** Units of this batch line on other lists. */
  allocatedElsewhere: number
  available: number
  /** The units as first drafted; `units` is the final value once the list is converted. Null on lists never converted. */
  tentativeUnits: number | null
  units: number
  cartons: number
  /** Outer carton size typed on the line, in cm; null on lines saved before cartons were recorded. */
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null; unit: LengthUnit }
  cbm: number
  /** Units per carton and CBM per piece; null while cartons or the carton size are missing. */
  unitsPerCarton: number | null
  cbmPerPiece: number | null
  netWeightKg: number
  grossWeightKg: number
}

export interface PackagingListDetail {
  id: number
  plNo: string
  kind: PackagingListKind
  finalizedAt: string | null
  suppliers: Array<{ id: number; name: string }>
  destination: PoDestination
  createdBy: { id: number; name: string | null }
  createdAt: string
  updatedAt: string
  purchaseOrders: Array<{ id: number; poNo: string }>
  batches: Array<{ id: number; poNo: string; label: string }>
  container: ContainerRef | null
  lines: PackagingLineDetail[]
  totals: { skuCount: number; units: number; cartons: number; cbm: number; netWeightKg: number; grossWeightKg: number }
}

/** A PO the container form can pick (its destination sets the container's country). */
export interface PackablePurchaseOrder {
  id: number
  poNo: string
  supplier: { id: number; name: string }
  destination: PoDestination
}

/** A batch IN PRODUCTION for the list form (any supplier), or one already on the list being edited. */
export interface PackableBatch {
  id: number
  batchNo: string
  /** `PO-0120 / Batch 2`. */
  label: string
  purchaseOrderId: number
  poNo: string
  supplier: { id: number; name: string }
  destination: PoDestination
  platform: ProductPlatform
  currency: PoCurrency
  productionDate: string | null
  units: number
}

export interface PackableBatchLines {
  batch: { id: number; seq: number; label: string; productionDate: string | null }
  /** `price` is the PO's total (units x rate) in its currency; null when no rate has been entered yet. */
  purchaseOrder: { id: number; poNo: string; currency: PoCurrency; destination: PoDestination; supplier: { id: number; name: string }; price: number | null }
  /** Every SKU of the batch: its units, taken by other lists, and left for this list. */
  lines: Array<{ product: PoProduct; poQty: number; allocated: number; available: number }>
}

/** A packaging list carrying a PO's units, as the invoice screens show it (units of this PO only). */
export interface PoPackagingListSummary {
  id: number
  plNo: string
  kind: PackagingListKind
  finalizedAt: string | null
  container: ContainerRef | null
  totals: { units: number; finalUnits: number | null; cartons: number; cbm: number }
  /** `units` is the drafted quantity, `finalUnits` the confirmed one (null until the list is converted). */
  lines: Array<{ product: PoProduct; units: number; finalUnits: number | null; cartons: number; cbm: number }>
}

export interface PackagingLineBody {
  batchId: number
  productId: number
  units: number
  cartons: number
  /** Outer carton L x W x H in `cartonUnit`; CBM is cartons x this volume. */
  cartonLength: number | null
  cartonWidth: number | null
  cartonHeight: number | null
  cartonUnit: LengthUnit
  /** Typed net weight; null takes the product's weight x units. */
  netWeightKg: number | null
  grossWeightKg: number
}

export interface PackagingListBody {
  batchIds: number[]
  lines: PackagingLineBody[]
  closePurchaseOrderIds: number[]
  expectedUpdatedAt?: string
}

/* ─────────────── SKU Landed ─────────────── */

/** Per-unit amounts: US containers count in USD, Canadian ones in CAD. */
export type LandedAmounts = Record<'CAD' | 'USD', number>

/** The networks a shipment goes into. */
export type InboundChannel = 'AMAZON_FBA' | 'WALMART_WFS'

export type OpexCountry = 'CA' | 'US'

export interface SkuLandedRow {
  product: { id: number; sku: string; name: string }
  landedCost: LandedAmounts
  /** Per unit and channel, from approved shipment payment requests; null while none of its shipments there is paid. */
  shipmentCost: Record<InboundChannel, number | null>
  /** From its latest packaging list line; null while no line has carton dimensions. */
  cbmPerPiece: number | null
  /** Per unit and country (CAD): the country's opex rate per CBM this month x the CBM per piece. */
  warehouseOverhead: Record<OpexCountry, number | null>
  containerCount: number
}

export type OpexColumnKey = 'thirdPartyLogistics'

/** One month's opex: warehouse overhead plus the 3PL payments, in `currency`. */
export interface MonthlyOpex {
  month: string
  currency: string
  overhead: { amount: number; recorded: boolean; edited: boolean; updatedAt: string | null }
  thirdParty: { amount: number; payments: number }
  total: number
  /** Per country: its warehouse cost, the CBM of containers delivered there in the month, and the rate per CBM. */
  countries: Record<OpexCountry, { cost: number; cbm: number; ratePerCbm: number | null }>
}

export interface SkuLandedReport extends Page<SkuLandedRow> {
  /** The day the costs are for (YYYY-MM-DD). */
  asOf: string
  /** `live` for today; `snapshot` for an earlier day, from that day's nightly snapshot. */
  source: 'live' | 'snapshot'
  /** Opex of the month of `asOf`, whose rates price the warehouse overhead. */
  opex: MonthlyOpex
  shipmentCurrency: string
}

/* ─────────────── Containers ─────────────── */

/**
 * Every status leaves the details editable except DELIVERED_AT_WAREHOUSE (waiting in Inbound Receiving): nothing can change there.
 * GOODS_RECEIVED is set by Inbound Receiving only; DELIVERED_TO_AWD (Amazon AWD) and FLOOR_LOADED come from the form.
 */
export type ContainerStatus = 'BOOKED' | 'IN_TRANSIT' | 'ON_RAIL' | 'ON_BOARD' | 'ARRIVED_AT_PORT' | 'CUSTOMS_CLEARED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERED_AT_WAREHOUSE' | 'GOODS_RECEIVED' | 'FLOOR_LOADED' | 'DELIVERED_TO_AWD'

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
  | 'shippedOnBoardAt'
  | 'warehouseId'
  | 'cubicFeet'
  | 'currency'

/** What the container's status allows; the server enforces the same rules. */
export interface ContainerPermissions {
  editableFields: ContainerField[]
  canChangeList: boolean
  canUpload: boolean
  /** The statuses the form may set, its current one included; the server decides them. */
  statuses: ContainerStatus[]
  canChangeStatus: boolean
}

export interface ContainerRef {
  id: number
  containerNo: string
  containerNumber: string | null
  status: ContainerStatus
}

export interface ContainerLine {
  /** The packaging list it is packed on. */
  plNo: string
  purchaseOrderId: number
  poNo: string
  sku: string
  name: string
  color: string | null
  platform: ProductPlatform
  sizeName: string | null
  /** Ordered on the PO, for "ordered vs. in this container". */
  ordered: number
  units: number
  cartons: number
  /** Carton size saved on the packaging list, in cm. */
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null }
  cbm: number
  /** Units per carton and CBM per piece; null while cartons or the carton size are missing. */
  unitsPerCarton: number | null
  cbmPerPiece: number | null
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
  /** The day it was shipped on board: entered by hand, locked once delivered. */
  shippedOnBoardAt: string | null
  /** ETD to ETA in days; null until both are set. */
  transitDays: number | null
  /** Capacity in cubic feet, entered by hand. */
  cubicFeet: number | null
  warehouse: { id: number; name: string } | null
  /** The platforms of the SKUs packed in it: one when they share it, both when mixed; empty while nothing is packed. */
  platforms: ProductPlatform[]
  /** The partners paid for customs brokerage on it (payments booked to the L4s mapped to Custom brokerage). */
  customsBrokers: string[]
  /** The final landed cost its cost analysis shows (FOB plus allocated expenses); null while nothing is packed. */
  totalCost: number | null
  /** The currency of `totalCost`: the destination's (goods priced in the other currency are converted into it). */
  totalCostCurrency: PoCurrency
  currency: PoCurrency
  deliveredAt: string | null
  updatedAt: string
  /** Cartons short and damaged on arrival; null until Inbound Receiving is confirmed. */
  receiving: { shortageCartons: number; damagedCartons: number } | null
  permissions: ContainerPermissions
  /** A placeholder made from a packaging list's request: no container number, bill of lading or ETD yet. */
  needsDetails: boolean
  /** The packaging lists it carries (several; each list in one container only). */
  packagingLists: Array<{ id: number; plNo: string; suppliers: Array<{ id: number; name: string }>; units: number; cbm: number }>
  /** Every PO packed into it, across its lists. */
  purchaseOrders: Array<{ id: number; poNo: string }>
  totals: { skus: number; units: number; cartons: number; cbm: number; netWeightKg: number; grossWeightKg: number }
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

export type ContainerSortColumn = 'etd' | 'eta'

export interface ContainerParams extends PageParams {
  status?: ContainerStatus
  destination?: PoDestination
  /** Containers packing at least one SKU of this platform (brand). */
  platform?: ProductPlatform
  sortBy?: ContainerSortColumn
  sortOrder?: 'asc' | 'desc'
}

/** The container expenses spread over SKUs, as the server names them (see the server's cost-buckets). */
export type CostBucketKey = 'oceanFreight' | 'trucking' | 'customsDuties' | 'customsBrokerage'
export type CostBuckets = Record<CostBucketKey, number>

/** What amounts that were converted into the container's currency were before, per original currency. */
export type OriginalAmounts = Record<string, number>

export interface CostTotals {
  units: number
  cbm: number
  goods: number
  goodsOriginal: OriginalAmounts
  additionalExpense: number
  additionalOriginal: OriginalAmounts
  costs: CostBuckets
  costsOriginal: Record<CostBucketKey, OriginalAmounts>
  total: number
}

export interface ContainerExpense {
  key: CostBucketKey
  label: string
  /** How it is split: by the SKU's CBM, or by its value (units x FOB + additional expense). */
  basis: 'cbm' | 'value'
  /** Approved payment requests. */
  paid: number
  /** Drafts and requests awaiting approval: not in the figures yet. */
  pending: number
  /** Paid but with nothing to split it by, so missing from the SKU rows. */
  unallocated: number
  /** False until the column is mapped to an L4 cost center. */
  mapped: boolean
}

/** A screen's expense columns, each with the L4 cost centers it takes payments from (an L4 feeds one column anywhere). */
export interface ExpenseMapping<K extends string, Extra = unknown> {
  columns: Array<{ key: K; label: string; costCenters: CostCenterOption[] } & Extra>
  /** Active L4 cost centers that can be picked. */
  options: CostCenterOption[]
  /** L4s another screen's columns hold (L4 id -> that column's label): they cannot be picked here. */
  elsewhere: Record<number, string>
}

export interface ExpenseMappingEntry<K extends string> {
  bucket: K
  costCenterIds: number[]
}

export type CostMapping = ExpenseMapping<CostBucketKey, { basis: 'cbm' | 'value' }>

export interface ContainerCostItem {
  id: number
  containerNo: string
  containerNumber: string | null
  status: ContainerStatus
  destination: PoDestination
  etd: string | null
  eta: string | null
  currency: PoCurrency
  /** More than one means amounts in different currencies were added up as they are. */
  currencies: string[]
  packagingLists: Array<{ id: number; plNo: string; suppliers: string[] }>
  skuCount: number
  totals: CostTotals
  expenses: ContainerExpense[]
  otherExpenses: { approved: number; pending: number }
}

export interface SkuCostRow {
  purchaseOrderId: number
  productId: number
  sku: string
  name: string
  color: string | null
  /** Brand: Ecommerce is Beddora, Retail is Northern Linen. */
  platform: ProductPlatform
  upc?: string | null
  units: number
  cartons: number
  carton: { lengthCm: number | null; widthCm: number | null; heightCm: number | null }
  cbm: number
  netWeightKg: number
  grossWeightKg: number
  cost: {
    fobPrice: number
    /** The FOB price as quoted, when it was converted into the container's currency. */
    fobOriginal: { amount: number; currency: string } | null
    goods: number
    goodsOriginal: OriginalAmounts
    additionalExpense: number
    additionalOriginal: OriginalAmounts
    costs: CostBuckets
    costsOriginal: Record<CostBucketKey, OriginalAmounts>
    total: number
  }
}

export interface ContainerCostDetail extends ContainerCostItem {
  purchaseOrders: Array<{
    id: number
    poNo: string
    supplier: { id: number; name: string } | null
    currency: string
    invoices: Array<{ id: number; invoiceNo: string; status: string }>
    skus: SkuCostRow[]
    totals: CostTotals
  }>
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
  shippedOnBoardAt: string | null
  warehouseId: number | null
  cubicFeet: number | null
  currency: PoCurrency
  expectedUpdatedAt?: string
}

/** A warehouse as a PO shows its delivery address (kept in Settings > Warehouses). */
export interface PoWarehouse {
  id: number
  name: string
  address: string
  city: string
  province: string | null
  postalCode: string | null
  country: string
}

/** A warehouse a container can be sent to (kept in Settings > Warehouses). */
export interface ContainerWarehouse {
  id: number
  name: string
  city: string
  province: string | null
  country: string
}

/* ─────────────── Price analysis ─────────────── */

/** The analysed product's own details (read-only on the price analysis screen). */
export type PriceAnalysisProduct = Pick<
  PoProduct,
  | 'id'
  | 'pid'
  | 'parentId'
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

/** The sample a supplier offers with a quote. */
export type QuoteSample = 'FREE_OF_COST' | 'BY_CHARGE' | 'NOT_PROVIDED'

export interface PriceQuote {
  /** The supplier as typed. */
  supplierName: string
  contactName: string | null
  remarks: string | null
  sample: QuoteSample
  /** The FOB price per unit. */
  unitPrice: number
  /** How the unit is packed for this quote; empty when the supplier gave one price. A supplier can quote several packagings. */
  packagingOption: string
  moq: number | null
  leadTimeDays: number | null
  unitCbm: number | null
  /** Overrides the family's default duty for this quote. */
  dutyPercent: number | null
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
  approval: { supplierName: string; packagingOption: string; unitPrice: number; remarks: string | null; by: { id: number; name: string | null }; at: string } | null
}

/** One line of an analysis's approval history: an approval, or an edit that took it back. */
export interface PriceAnalysisEvent {
  id: number
  type: 'APPROVED' | 'STEP_APPROVED' | 'REJECTED' | 'APPROVAL_CLEARED'
  supplierName: string | null
  unitPrice: number | null
  currency: string | null
  remarks: string | null
  by: { id: number; name: string | null }
  at: string
}

/** An approval event of the family's history, with the variant it is about. */
export interface PriceFamilyEvent extends PriceAnalysisEvent {
  variant: { id: number; ref: string; name: string; variantName: string | null; color: string | null; sizeName: string | null }
}

/** One dated snapshot of a product's price analysis: who quoted what when it was saved. */
export interface PriceAnalysisRevision {
  id: number
  type: 'CREATED' | 'UPDATED' | 'REMOVED'
  material: string | null
  currency: string
  quotes: Array<{ supplierName: string; packagingOption?: string; moq?: number | null; leadTimeDays?: number | null; unitCbm?: number | null; dutyPercent?: number | null; contactName: string | null; remarks: string | null; sample?: QuoteSample; unitPrice: number }>
  /** The landed-cost inputs of the family when this was saved; null for snapshots from before they were kept. */
  assumptions: Omit<PriceFamilySettings, 'updatedAt'> | null
  by: { id: number; name: string | null }
  at: string
}

/** Landed-cost inputs shared by a family's variants. Off: quotes are ranked by FOB only. */
export interface PriceFamilySettings {
  landedEnabled: boolean
  freightPerCbm: number | null
  defaultDutyPercent: number | null
  clearingPerUnit: number | null
  updatedAt: string | null
}

/** One variant of a family, for the variant chips. */
export interface PriceFamilyVariant {
  id: number
  ref: string
  name: string
  variantName: string | null
  color: string | null
  sizeName: string | null
  packaging: string | null
  status: PriceAnalysisStatus
  quoteCount: number
  /** The approved quote of this variant: who, at what price, when; null while none is approved. */
  approved: { supplierName: string; packagingOption: string; unitPrice: number | null; currency: PoCurrency; by: { id: number; name: string | null } | null; at: string | null } | null
}

export interface PriceFamily {
  root: { id: number; name: string; ref: string }
  variants: PriceFamilyVariant[]
  approvedCount: number
  settings: PriceFamilySettings
}

export interface PriceAnalysisView {
  product: PriceAnalysisProduct
  /** The family this product is a variant of; null for a product on its own. */
  family: PriceFamily | null
  /** The landed-cost inputs that apply to this product (its family's). */
  settings: PriceFamilySettings
  analysis: PriceAnalysis | null
  /** Newest first. */
  history: PriceAnalysisEvent[]
  permissions: { canApprove: boolean; canReject: boolean }
  /** The approval chain waiting on this analysis (who approved which supplier at each step); null without one. */
  approval: PoApproval | null
}

/** NONE: no quotes yet · PENDING: quoted, waiting for approval · APPROVED: one quote approved. */
export type PriceAnalysisStatus = 'NONE' | 'PENDING' | 'APPROVED'

export interface PriceAnalysisListItem {
  product: PriceAnalysisProduct & { category: CategoryRef | null }
  status: PriceAnalysisStatus
  currency: PoCurrency | null
  supplierCount: number
  lowest: { supplier: string; unitPrice: number } | null
  /** The family this variant belongs to, with how many of its variants are approved; null for a product on its own. */
  family: { rootId: number; name: string; variants: number; approved: number } | null
  approval: { supplierName: string; packagingOption: string; unitPrice: number; by: { id: number; name: string | null }; at: string } | null
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
  quotes: Array<{ supplierName: string; packagingOption: string; moq: number | null; leadTimeDays: number | null; unitCbm: number | null; dutyPercent: number | null; contactName: string | null; remarks: string | null; sample: QuoteSample; unitPrice: number }>
  /** When the analysis was loaded; `null` = there was none yet. */
  expectedUpdatedAt: string | null
}

/** Arrays go to the API as comma-separated values; empty ones are left out. */
const csv = (values?: Array<string | number>) => (values && values.length ? values.join(',') : undefined)

/** An HS code from the customs catalogue, and the product categories it is the default for. */
export interface ProductHsCodeOption {
  code: string
  label: string
  categories: string[]
}

/* ─────────────── Product import (Excel) ─────────────── */

export type ProductImportStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED'

/** One Excel upload, built in the background. Also the `data` of its `import.progress` / `import.finished` realtime events (progress events carry only the counters). */
export interface ProductImport {
  id: number
  fileName: string
  status: ProductImportStatus
  /** Queued or running: no other upload can start. */
  active: boolean
  totalProducts: number
  processedProducts: number
  createdProducts: number
  failedProducts: number
  percent: number
  error: string | null
  createdById: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface ProductImportRow {
  id: number
  rowNumber: number
  name: string
  variationCount: number
  status: 'CREATED' | 'FAILED'
  productId: number | null
  error: string | null
}

export const PRODUCT_IMPORT_TEMPLATE_URL = '/procurement/products/import/template'

export const procurementApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getPoProducts: b.query<Page<PoProductListItem>, ProductListParams>({
      query: ({ search, marketplace, ...params }) => ({
        url: '/procurement/products',
        params: { ...params, search: search || undefined, marketplace: marketplace?.length ? marketplace.join(',') : undefined },
      }),
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
    getPoProductOptions: b.query<PoProduct[], { search?: string; limit?: number; parentsOnly?: boolean; platform?: ProductPlatform }>({
      query: ({ search, limit, parentsOnly, platform }) => ({ url: '/procurement/products/options', params: { search: search || undefined, limit, parentsOnly: parentsOnly || undefined, platform } }),
      transformResponse: unwrap,
      // A search result goes stale the moment a product is created; don't keep one around for reuse
      keepUnusedDataFor: 0,
      providesTags: ['ProcurementProducts'],
    }),
    /** The HS codes we ship under, with the product categories each is the default for. */
    getProductHsCodes: b.query<ProductHsCodeOption[], void>({
      query: () => '/procurement/products/hs-codes',
      transformResponse: unwrap,
      keepUnusedDataFor: 3600,
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
    /** Deletes for good; refused (409) while a purchase order, packaging list or invoice uses the product. */
    deletePoProduct: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/products/${id}`, method: 'DELETE' }),
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
    /** The latest Excel import: running, or the last one finished. */
    getProductImportCurrent: b.query<ProductImport | null, void>({
      query: () => '/procurement/products/import/current',
      transformResponse: unwrap,
      providesTags: ['ProcurementProductImports'],
    }),
    getProductImportRows: b.query<Page<ProductImportRow>, { importId: number; status: ProductImportRow['status']; page: number; limit: number }>({
      query: ({ importId, ...params }) => ({ url: `/procurement/products/import/${importId}/rows`, params }),
      providesTags: ['ProcurementProductImports'],
    }),
    /** Queues the sheet and returns at once; products are created in the background. 409 while another import is running. */
    uploadProductImport: b.mutation<ProductImport, File>({
      query: (file) => {
        const body = new FormData()
        body.append('file', file)
        return { url: '/procurement/products/import', method: 'POST', body }
      },
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementProductImports'],
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
    getPurchaseOrderLastPurchases: b.query<PoLastPurchase[], { productIds: number[]; excludeId?: number }>({
      query: ({ productIds, excludeId }) => ({ url: '/procurement/purchase-orders/last-purchases', params: { productIds: productIds.join(','), ...(excludeId ? { excludeId } : {}) } }),
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
    addPurchaseOrderBatch: b.mutation<PurchaseOrderDetail, { id: number; body: AddBatchBody }>({
      query: ({ id, body }) => ({ url: `/procurement/purchase-orders/${id}/batches`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders', 'ProcurementPackagingLists'],
    }),
    setPurchaseOrderBatchProductionDate: b.mutation<PurchaseOrderDetail, { id: number; batchId: number; productionDate: string }>({
      query: ({ id, batchId, productionDate }) => ({ url: `/procurement/purchase-orders/${id}/batches/${batchId}/production-date`, method: 'PUT', body: { productionDate } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    updateProcurementPurchaseOrder: b.mutation<PurchaseOrderDetail, { id: number; body: PurchaseOrderBody }>({
      query: ({ id, body }) => ({ url: `/procurement/purchase-orders/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    setPurchaseOrderArd: b.mutation<{ id: number; ard: string | null }, { id: number; ard: string | null }>({
      query: ({ id, ard }) => ({ url: `/procurement/purchase-orders/${id}/ard`, method: 'PUT', body: { ard } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    setPurchaseOrderProductionDate: b.mutation<{ id: number; productionDate: string; status?: PoStatus }, { id: number; productionDate: string }>({
      query: ({ id, productionDate }) => ({ url: `/procurement/purchase-orders/${id}/production-date`, method: 'PUT', body: { productionDate } }),
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
    /** Marks the goods Ready to ship: fires the PO Ready to ship notification (set up on the Approvals screen). */
    markPurchaseOrderReadyToShip: b.mutation<PurchaseOrderDetail, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}/ready-to-ship`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders', 'ProcurementPackagingLists'],
    }),
    submitPurchaseOrder: b.mutation<PurchaseOrderDetail, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}/submit`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    deleteProcurementPurchaseOrder: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/purchase-orders/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPurchaseOrders'],
    }),
    deletePurchaseInvoice: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/purchase-invoices/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),
    deleteContainer: b.mutation<void, number>({
      query: (id) => ({ url: `/procurement/containers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementContainers'],
    }),
    deletePriceAnalysis: b.mutation<void, number>({
      query: (productId) => ({ url: `/procurement/price-analysis/${productId}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPriceAnalysis'],
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

    /* purchase invoices */
    getPurchaseInvoices: b.query<Page<PurchaseInvoiceListItem>, PurchaseInvoiceListParams>({
      query: ({ search, statuses, ...params }) => ({ url: '/procurement/purchase-invoices', params: { ...params, search: search || undefined, statuses: csv(statuses) } }),
      providesTags: ['ProcurementPurchaseInvoices'],
    }),
    getPurchaseInvoiceSummary: b.query<{ byStatus: Record<PurchaseInvoiceStatus, number>; all: number }, Omit<PurchaseInvoiceListParams, 'page' | 'limit' | 'statuses'>>({
      query: ({ search, ...params }) => ({ url: '/procurement/purchase-invoices/summary', params: { ...params, search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseInvoices'],
    }),
    getPurchaseInvoice: b.query<PurchaseInvoiceDetail, number>({
      query: (id) => `/procurement/purchase-invoices/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseInvoices'],
    }),
    /** L4 cost centers to book the invoice to, without needing Finance access. */
    getPurchaseInvoiceCostCenters: b.query<CostCenterOption[], void>({
      query: () => '/procurement/purchase-invoices/cost-centers',
      transformResponse: unwrap,
      providesTags: ['FinanceCostCenters'],
    }),
    /** Destination marketplaces, without needing Finance access. */
    getPurchaseInvoiceDestinations: b.query<Array<{ id: number; name: string; code: string }>, void>({
      query: () => '/procurement/purchase-invoices/destinations',
      transformResponse: unwrap,
      keepUnusedDataFor: 3600,
    }),
    /** Documents of the PO's payment requests, offered to carry into a new invoice. */
    getPurchaseOrderInvoiceDocuments: b.query<FinanceDocument[], number>({
      query: (purchaseOrderId) => ({ url: '/procurement/purchase-invoices/po-documents', params: { purchaseOrderId } }),
      transformResponse: unwrap,
      providesTags: ['FinanceRequests'],
    }),
    createPurchaseInvoice: b.mutation<PurchaseInvoiceDetail, FormData>({
      query: (body) => ({ url: '/procurement/purchase-invoices', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),
    updatePurchaseInvoice: b.mutation<PurchaseInvoiceDetail, { id: number; body: Partial<PurchaseInvoiceBody> }>({
      query: ({ id, body }) => ({ url: `/procurement/purchase-invoices/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),
    purchaseInvoiceAction: b.mutation<PurchaseInvoiceDetail, { id: number; action: 'submit' | 'withdraw' | 'approve' | 'reject' | 'hold'; reason?: string; note?: string }>({
      query: ({ id, action, reason, note }) => ({ url: `/procurement/purchase-invoices/${id}/${action}`, method: 'POST', body: reason ? { reason } : note ? { note } : {} }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),
    addPurchaseInvoiceDocuments: b.mutation<FinanceDocument[], { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `/procurement/purchase-invoices/${id}/documents`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),
    removePurchaseInvoiceDocument: b.mutation<void, { id: number; documentId: string }>({
      query: ({ id, documentId }) => ({ url: `/procurement/purchase-invoices/${id}/documents/${documentId}`, method: 'DELETE' }),
      invalidatesTags: ['ProcurementPurchaseInvoices'],
    }),

    /* packaging lists */
    getPackagingLists: b.query<Page<PackagingListItem>, PackagingListParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/packaging-lists', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementPackagingLists', 'ProcurementContainers'],
    }),
    getPackagingListSummary: b.query<{ all: number; tentative: number; final: number; withoutContainer: number }, void>({
      query: () => '/procurement/packaging-lists/summary',
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists'],
    }),
    getPackagingList: b.query<PackagingListDetail, number>({
      query: (id) => `/procurement/packaging-lists/${id}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists'],
    }),
    getPackablePurchaseOrders: b.query<PackablePurchaseOrder[], Record<string, never>>({
      query: () => '/procurement/packaging-lists/po-options',
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    getPackableBatches: b.query<PackableBatch[], { excludeListId?: number }>({
      query: (params) => ({ url: '/procurement/packaging-lists/batch-options', params }),
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    getPackableBatchLines: b.query<PackableBatchLines[], { batchIds: number[]; excludeListId?: number }>({
      query: ({ batchIds, excludeListId }) => ({ url: '/procurement/packaging-lists/batch-lines', params: { batchIds: csv(batchIds), excludeListId } }),
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
    /** Converts a tentative list to final: the body's units are the confirmed (final) units. */
    finalizePackagingList: b.mutation<PackagingListDetail, { id: number; body: PackagingListBody }>({
      query: ({ id, body }) => ({ url: `/procurement/packaging-lists/${id}/finalize`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    getPoPackagingLists: b.query<PoPackagingListSummary[], number>({
      query: (purchaseOrderId) => `/procurement/purchase-orders/${purchaseOrderId}/packaging-lists`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
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
    getContainerCosts: b.query<Page<ContainerCostItem>, ContainerParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/containers/cost-analysis', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementContainers', 'FinanceRequests'],
    }),
    getContainerCostDetail: b.query<ContainerCostDetail, number>({
      query: (id) => `/procurement/containers/${id}/cost-analysis`,
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers', 'FinanceRequests'],
    }),
    getSkuLanded: b.query<SkuLandedReport, PageParams & { asOf?: string }>({
      query: ({ search, asOf, ...params }) => ({ url: '/procurement/containers/sku-landed', params: { ...params, search: search || undefined, asOf: asOf || undefined } }),
      providesTags: ['ProcurementContainers', 'FinanceRequests'],
    }),
    getSkuLandedOpex: b.query<MonthlyOpex, string>({
      query: (month) => `/procurement/containers/sku-landed/opex/${month}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers', 'FinanceRequests'],
    }),
    setWarehouseOverhead: b.mutation<MonthlyOpex, { month: string; amount: number }>({
      query: ({ month, amount }) => ({ url: `/procurement/containers/sku-landed/opex/${month}/overhead`, method: 'PUT', body: { amount } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
    }),
    getSkuLandedMapping: b.query<ExpenseMapping<OpexColumnKey>, void>({
      query: () => '/procurement/containers/sku-landed/mapping',
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    saveSkuLandedMapping: b.mutation<ExpenseMapping<OpexColumnKey>, ExpenseMappingEntry<OpexColumnKey>[]>({
      query: (mappings) => ({ url: '/procurement/containers/sku-landed/mapping', method: 'PUT', body: { mappings } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
    }),
    getContainerCostMapping: b.query<CostMapping, void>({
      query: () => '/procurement/containers/cost-analysis/mapping',
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    saveContainerCostMapping: b.mutation<CostMapping, Array<{ bucket: CostBucketKey; costCenterIds: number[] }>>({
      query: (mappings) => ({ url: '/procurement/containers/cost-analysis/mapping', method: 'PUT', body: { mappings } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
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
    /** Warehouses the PO form offers as the delivery address. */
    getPoWarehouses: b.query<PoWarehouse[], void>({
      query: () => '/procurement/purchase-orders/warehouses',
      transformResponse: unwrap,
      providesTags: ['Warehouses'],
    }),
    getContainerWarehouses: b.query<ContainerWarehouse[], void>({
      query: () => '/procurement/containers/warehouses',
      transformResponse: unwrap,
    }),
    getContainerPorts: b.query<string[], PoDestination>({
      query: (destination) => ({ url: '/procurement/containers/ports', params: { destination } }),
      transformResponse: unwrap,
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
    /** The shipped-on-board date picked straight from the table (null clears it); locked once delivered. */
    setContainerShippedOnBoard: b.mutation<ContainerItem, { id: number; shippedOnBoardAt: string | null }>({
      query: ({ id, shippedOnBoardAt }) => ({ url: `/procurement/containers/${id}/shipped-on-board`, method: 'PATCH', body: { shippedOnBoardAt } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers'],
    }),
    /** A packaging list asks for a container: a placeholder takes the list and the container team is notified. */
    requestContainer: b.mutation<ContainerItem & { notified: NotifiedPerson[] }, { packagingListId: number }>({
      query: (body) => ({ url: '/procurement/containers/request', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    /** Who Request container will tell (the Approvals > Notifications rule, minus the asker). */
    getContainerRequestRecipients: b.query<NotifiedPerson[], void>({
      query: () => '/procurement/containers/request/recipients',
      transformResponse: unwrap,
      providesTags: ['ProcurementContainers'],
    }),
    /** Puts one more packaging list in a booked container. */
    addContainerPackagingList: b.mutation<ContainerItem, { id: number; packagingListId: number }>({
      query: ({ id, packagingListId }) => ({ url: `/procurement/containers/${id}/packaging-lists`, method: 'POST', body: { packagingListId } }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),
    /** Takes one packaging list out of a booked container. */
    removeContainerPackagingList: b.mutation<ContainerItem, { id: number; packagingListId: number }>({
      query: ({ id, packagingListId }) => ({ url: `/procurement/containers/${id}/packaging-lists/${packagingListId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementContainers', 'ProcurementPackagingLists', 'ProcurementPurchaseOrders'],
    }),

    /* price analysis */
    getPriceAnalyses: b.query<Page<PriceAnalysisListItem>, PriceAnalysisListParams>({
      query: ({ search, ...params }) => ({ url: '/procurement/price-analysis', params: { ...params, search: search || undefined } }),
      providesTags: ['ProcurementPriceAnalysis'],
    }),
    approvePriceAnalysis: b.mutation<PriceAnalysisView, { productId: number; supplierName: string; packagingOption?: string; expectedUpdatedAt?: string }>({
      query: ({ productId, ...body }) => ({ url: `/procurement/price-analysis/${productId}/approve`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    /** Takes an approval back so the locked analysis can be changed; a fresh approval chain starts. */
    reopenPriceAnalysis: b.mutation<PriceAnalysisView, { productId: number }>({
      query: ({ productId }) => ({ url: `/procurement/price-analysis/${productId}/reopen`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    rejectPriceAnalysisQuote: b.mutation<PriceAnalysisView, { productId: number; supplierName: string; packagingOption?: string; reason: string; expectedUpdatedAt?: string }>({
      query: ({ productId, ...body }) => ({ url: `/procurement/price-analysis/${productId}/reject`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    getPriceAnalysis: b.query<PriceAnalysisView, number>({
      query: (productId) => `/procurement/price-analysis/${productId}`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPriceAnalysis'],
    }),
    /** The landed-cost inputs shared by a family's variants. */
    savePriceFamilySettings: b.mutation<PriceFamilySettings, { rootId: number; body: Omit<PriceFamilySettings, 'updatedAt'> }>({
      query: ({ rootId, body }) => ({ url: `/procurement/price-analysis/family/${rootId}/settings`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['ProcurementPriceAnalysis'],
    }),
    /** Approvals, rejections and taken-back approvals of every variant of a family, newest first. */
    getPriceFamilyHistory: b.query<PriceFamilyEvent[], number>({
      query: (rootId) => `/procurement/price-analysis/family/${rootId}/history`,
      transformResponse: unwrap,
      providesTags: ['ProcurementPriceAnalysis'],
    }),
    getPriceAnalysisRevisions: b.query<PriceAnalysisRevision[], number>({
      query: (productId) => `/procurement/price-analysis/${productId}/revisions`,
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
  useGetSkuLandedQuery,
  useGetSkuLandedOpexQuery,
  useSetWarehouseOverheadMutation,
  useGetSkuLandedMappingQuery,
  useSaveSkuLandedMappingMutation,
  useGetPoProductsQuery,
  useGetPoProductSummaryQuery,
  useGetPoProductQuery,
  useGetPoProductOptionsQuery,
  useGetProductHsCodesQuery,
  useLazyCheckPoProductSkuQuery,
  useCreatePoProductMutation,
  useUpdatePoProductMutation,
  useArchivePoProductMutation,
  useDeletePoProductMutation,
  useUploadPoProductPhotoMutation,
  useRemovePoProductPhotoMutation,
  useGetProductImportCurrentQuery,
  useGetProductImportRowsQuery,
  useUploadProductImportMutation,
  useGetPoCategoriesQuery,
  useCreatePoCategoryMutation,
  useUpdatePoCategoryMutation,
  useDeletePoCategoryMutation,
  useGetProcurementPurchaseOrdersQuery,
  useGetProcurementPurchaseOrderSummaryQuery,
  useGetPurchaseOrderFilterOptionsQuery,
  useGetPurchaseOrderLastPurchasesQuery,
  useGetProcurementPurchaseOrderQuery,
  useGetPurchaseOrderRemainingQuery,
  useCreateProcurementPurchaseOrderMutation,
  useUpdateProcurementPurchaseOrderMutation,
  useSetPurchaseOrderArdMutation,
  useSetPurchaseOrderProductionDateMutation,
  useSetPurchaseOrderOpenMutation,
  useApprovePurchaseOrderMutation,
  useRejectPurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useMarkPurchaseOrderReadyToShipMutation,
  useDeleteProcurementPurchaseOrderMutation,
  useDeletePurchaseInvoiceMutation,
  useDeleteContainerMutation,
  useDeletePriceAnalysisMutation,
  useSetPurchaseOrderLockedMutation,
  useGetSupplierOptionsQuery,
  useGetPurchaseInvoicesQuery,
  useGetPurchaseInvoiceSummaryQuery,
  useGetPurchaseInvoiceQuery,
  useGetPurchaseOrderInvoiceDocumentsQuery,
  useGetPurchaseInvoiceDestinationsQuery,
  useGetPurchaseInvoiceCostCentersQuery,
  useCreatePurchaseInvoiceMutation,
  useUpdatePurchaseInvoiceMutation,
  usePurchaseInvoiceActionMutation,
  useAddPurchaseInvoiceDocumentsMutation,
  useRemovePurchaseInvoiceDocumentMutation,
  useGetPackagingListsQuery,
  useGetPackagingListSummaryQuery,
  useGetPackagingListQuery,
  useGetPackablePurchaseOrdersQuery,
  useAddPurchaseOrderBatchMutation,
  useSetPurchaseOrderBatchProductionDateMutation,
  useGetPackableBatchesQuery,
  useGetPackableBatchLinesQuery,
  useCreatePackagingListMutation,
  useUpdatePackagingListMutation,
  useFinalizePackagingListMutation,
  useGetPoPackagingListsQuery,
  useDeletePackagingListMutation,
  useGetContainersQuery,
  useGetContainerSummaryQuery,
  useGetContainerCostsQuery,
  useGetContainerCostDetailQuery,
  useGetContainerCostMappingQuery,
  useGetContainerWarehousesQuery,
  useGetPoWarehousesQuery,
  useSetContainerShippedOnBoardMutation,
  useSaveContainerCostMappingMutation,
  useGetContainerQuery,
  useGetContainerDetailQuery,
  useUploadContainerDocumentsMutation,
  useGetContainerPortsQuery,
  useCreateContainerMutation,
  useUpdateContainerMutation,
  useRequestContainerMutation,
  useGetContainerRequestRecipientsQuery,
  useAddContainerPackagingListMutation,
  useRemoveContainerPackagingListMutation,
  useGetPriceAnalysesQuery,
  useApprovePriceAnalysisMutation,
  useReopenPriceAnalysisMutation,
  useRejectPriceAnalysisQuoteMutation,
  useGetPriceAnalysisQuery,
  useGetPriceAnalysisRevisionsQuery,
  useGetPriceFamilyHistoryQuery,
  useSavePriceFamilySettingsMutation,
  useSavePriceAnalysisMutation,
} = procurementApi
