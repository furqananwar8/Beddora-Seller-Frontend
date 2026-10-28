import { baseApi } from './baseApi'
import { csv } from './queryParams'

/* ─────────────── Shared ─────────────── */

export interface Page<T> {
  success: boolean
  data: T[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export interface Envelope<T> {
  success: boolean
  data: T
}

export const unwrap = <T,>(response: Envelope<T>): T => response.data

export interface PageParams {
  page: number
  limit: number
  search?: string
}

export interface UserRef {
  id: number
  name: string | null
}

export interface FinanceDocument {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  uploadedBy: UserRef
}

/* ─────────────── Partners ─────────────── */

export type PartnerType = 'VENDOR' | 'SUPPLIER'

export interface PartnerListItem {
  id: number
  name: string
  type: PartnerType
  contactName: string | null
  country: string | null
  province: string | null
  city: string | null
  currency: string
  email: string | null
  paymentMethod: string | null
  lastPaidAt: string | null
  createdBy: UserRef
}

export interface PartnerListParams extends PageParams {
  type?: PartnerType
}

export interface PartnerOption {
  id: number
  name: string
  type: PartnerType
  /** Default point of contact, prefilled wherever the partner is picked. */
  contactName: string | null
  country: string | null
  currency: string
  /** Days after the invoice date the partner is paid; a request's due date starts from it. */
  paymentTermDays: number | null
  paymentMethod: string | null
  /** The method requests are paid to (the latest one), shown once the partner is picked. */
  paymentDetails: Omit<PaymentMethod, 'documents'> | null
}

export interface PaymentMethod {
  id: number
  type: 'BANK' | 'CARD_LINK'
  label: string
  swiftCode: string | null
  routingNo: string | null
  accountHolder: string | null
  paymentLink: string | null
  createdAt: string
  documents: FinanceDocument[]
}

/** A company bank account payments are made from. */
export interface BankProfile extends PaymentMethod {
  name: string
  currency: string
  creditCardName: string | null
  createdBy: { id: number; name: string | null }
}

export interface BankProfileListParams {
  page: number
  limit: number
  search?: string
}

export interface PartnerDetail {
  id: number
  name: string
  type: PartnerType
  contactName: string | null
  email: string | null
  country: string | null
  province: string | null
  city: string | null
  postalCode: string | null
  /** Street line. */
  address: string | null
  currency: string
  paymentTermDays: number | null
  createdAt: string
  createdBy: UserRef
  updatedBy: UserRef | null
  paymentMethods: PaymentMethod[]
  documents: FinanceDocument[]
}

/* ─────────────── Partner aging ─────────────── */

export type AgingGroup = 'upcoming' | 'overdue'

export interface AgingBucket {
  key: string
  label: string
  group: AgingGroup
}

export interface AgingCell {
  amount: number
  count: number
}

export interface AgingEntry {
  id: number
  requestNo: string
  reference: string
  status: RequestStatus
  invoiceDate: string
  dueDate: string
  /** 0 is due today, negative is overdue. */
  daysToDue: number
  bucket: string
  amount: number
  paid: number
  outstanding: number
}

export interface AgingRow {
  partner: { id: number; name: string; type: PartnerType }
  currency: string
  cells: Record<string, AgingCell>
  total: number
  entries: AgingEntry[]
}

/** Open payments per partner and currency, by how far they are from (or past) their due date. */
export interface PartnerAgingReport {
  asOf: string
  /** The columns in display order, as the server buckets them. */
  buckets: AgingBucket[]
  rows: AgingRow[]
  /** Column totals, one line per currency. */
  totals: Array<{ currency: string; cells: Record<string, AgingCell>; total: number }>
}

/* ─────────────── Cashflow planning ─────────────── */

export type CashflowGrouping = 'day' | 'week' | 'month'

/** One column: a day, a week (Monday to Sunday) or a month, clipped to the range. */
export interface CashflowPeriod {
  key: string
  label: string
  start: string
  end: string
}

/** How a set of requests stands: every one paid in full, none, or some of each. */
export type CashflowPaymentState = 'PAID' | 'UNPAID' | 'PARTLY_PAID'

/** One approved payment request, under its due date. */
export interface CashflowRow {
  requestId: number
  requestNo: string
  /** Invoice number, or the PO number of a purchase-order request. */
  invoiceRef: string
  partner: { id: number; name: string }
  currency: string
  /** YYYY-MM-DD; the invoice date when the request has no due date. */
  dueDate: string
  /** The period column it falls in. */
  period: string
  amount: number
  paidAmount: number
  /** Paid in full (or settled); otherwise money is still owed. */
  paid: boolean
}

/** A footer cell: one currency's requests in one period, summed, and how they stand. */
export interface CashflowTotalCell {
  amount: number
  count: number
  paidCount: number
  state: CashflowPaymentState
}

export interface CashflowReport {
  from: string
  to: string
  groupBy: CashflowGrouping
  periods: CashflowPeriod[]
  rows: CashflowRow[]
  /** One footer line per currency. */
  totals: Array<{ currency: string; cells: Record<string, CashflowTotalCell>; total: CashflowTotalCell }>
}

export interface CashflowParams {
  /** YYYY-MM-DD, at most two months apart. */
  from: string
  to: string
  groupBy: CashflowGrouping
  currencies?: string[]
  /** Paid in full, or still owing; left out, both. */
  payment?: CashflowPaymentFilter
}

export type CashflowPaymentFilter = 'PAID' | 'UNPAID'

/* ─────────────── Payment requests ─────────────── */

export type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

/** An existing live request for the same partner and invoice, with what has been paid against it. */
/** The invoice number is one of our purchase invoices: whether it can be paid now (null when it cannot be told apart). */
export interface PurchaseInvoiceForPayment {
  id: number
  invoiceRef: string
  invoiceNo: string
  status: string
  currency: string
  amount: number
  /** The invoice's destination; a request paying it ships there too. */
  marketplaceId: number | null
  /** The PO the invoice was raised from; its earlier payments are shown on the form. */
  purchaseOrder: PoRef | null
  /** Not yet asked for by pending or approved requests: the most this request may ask for. */
  leftToRequest: number
  /** Why a payment request cannot pay it now; null when it can. */
  blockedReason: string | null
}

/** An earlier request paying a purchase order, directly or through one of its invoices. */
export interface PurchaseOrderPayment {
  id: number
  referenceType: ReferenceType
  invoiceNo: string | null
  status: RequestStatus
  currency: string
  amount: number
  paidAmount: number
  paymentStatus: DocStatus | null
  createdAt: string
}

/** An L4 cost center, the level expenses are booked to. */
export interface CostCenterOption {
  id: number
  code: string
  name: string
  /** L1 › L2 › L3 › L4 names. */
  path: string
}

export interface DuplicateInvoice {
  id: number
  status: RequestStatus
  currency: string
  amount: number
  paidAmount: number
  remaining: number
}

/** What a request pays against. */
export type ReferenceType = 'INVOICE' | 'PURCHASE_ORDER' | 'SHIPMENT'

/** One of a carrier's FBA shipments, as a shipment request picks and shows it. */
export interface CarrierShipment {
  id: number
  /** SHP-0042 */
  reference: string
  name: string
  marketplace: string
  status: string
  shippedAt: string | null
}

export interface PoRef {
  id: number
  poNo: string
}

/** `Invoice INV-1` or `Purchase order PO-1043`, as the API formats it. */
export interface PaymentReference {
  label: 'Invoice' | 'Purchase order'
  value: string
}

export interface PayablePurchaseOrder extends PoRef {
  currency: string
  destination: 'US' | 'CA'
  etd: string
  units: number
  /** The PO's price and what further requests may still ask for, in its currency. */
  amount: number
  leftToRequest: number
}

export interface PaymentRequestListItem {
  id: number
  referenceType: ReferenceType
  invoiceNo: string | null
  purchaseOrder: PoRef | null
  invoiceDate: string
  /** This request's own due date (defaulted from the partner's payment term). */
  dueDate: string | null
  containerNo: string | null
  currency: string
  amount: number
  status: RequestStatus
  createdAt: string
  decisionNote: string | null
  remarks: string | null
  partner: { id: number; name: string; type: PartnerType }
  /** Display name of what it is booked to: the L4 cost center's path (or, on older records, the expense type). */
  expenseType: { id: number; name: string }
  costCenter: CostCenterOption | null
  requestedBy: UserRef
  decidedBy: UserRef | null
  documentCount: number
  payment: { paidAmount: number; remaining: number; status: DocStatus } | null
  /** The viewer may edit this request (their own draft or rejected one). */
  canEdit: boolean
}

/** Approved requests split by whether finance has marked their payment paid. */
export type RequestPaymentFilter = 'PAID' | 'UNPAID'

export interface PaymentRequestListParams extends PageParams {
  status?: RequestStatus
  payment?: RequestPaymentFilter
  /** Only requests paying this purchase order. */
  purchaseOrderId?: number
  costCenterId?: number
  dateFrom?: string
  dateTo?: string
  scope?: 'mine' | 'all'
}

export interface PaymentRequestSummary {
  byStatus: Record<RequestStatus, number>
  byPayment: Record<RequestPaymentFilter, number>
  all: number
  pendingTotals: Array<{ currency: string; amount: number }>
}

export interface TimelineEvent {
  id: number
  type: 'CREATED' | 'SUBMITTED' | 'NOTIFIED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'POP_ADDED' | 'PAID'
  createdAt: string
  actor: UserRef | null
  payload: Record<string, unknown> | null
}

export interface PaymentRequestDetail {
  id: number
  status: RequestStatus
  referenceType: ReferenceType
  invoiceNo: string | null
  purchaseOrder: PoRef | null
  invoiceDate: string
  dueDate: string | null
  containerNo: string | null
  currency: string
  /** The total of `lines`. */
  amount: number
  /** Snapshot taken when the request was created: the reporting currency, that day's rate and the amount in it. */
  baseCurrency: string | null
  fxRate: number | null
  fxRateAsOf: string | null
  baseAmount: number | null
  /** Amounts and the L4 cost centers they are booked to; an invoice request may have several. */
  lines: PaymentRequestLine[]
  /** Shipment requests: the FBA shipments the carrier's invoice is for. */
  shipments: CarrierShipment[]
  remarks: string | null
  decisionNote: string | null
  submittedAt: string | null
  decidedAt: string | null
  partner: { id: number; name: string; type: PartnerType; country: string | null; currency: string; paymentTermDays: number | null }
  /** Display name of what it is booked to: the L4 cost center's path (or, on older records, the expense type). */
  expenseType: { id: number; name: string }
  costCenter: CostCenterOption | null
  marketplace: { id: number; name: string; code?: string } | null
  marketplaceId: number | null
  requestedBy: UserRef
  decidedBy: UserRef | null
  documents: FinanceDocument[]
  events: TimelineEvent[]
  paymentDocument: { id: number; status: DocStatus; currency: string; amount: number; paidAmount: number; balance: number } | null
  can: { edit: boolean; submit: boolean; withdraw: boolean; decide: boolean }
}

export interface PaymentRequestLine {
  id: number
  amount: number
  costCenter: CostCenterOption | null
}

export interface ExpenseType {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
  /** How many payment requests use this type; only a type with none can be deleted. */
  requestCount?: number
}

export interface Marketplace {
  id: number
  name: string
  code: string
}

export interface Approver {
  user: { id: number; name: string | null; email: string }
  addedBy: UserRef | null
  addedAt?: string | null
}

export interface UserCandidate {
  id: number
  name: string | null
  email: string
}

/* ─────────────── Payment process ─────────────── */

export type DocStatus = 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'POP_UPLOADED' | 'PAID' | 'AMOUNT_SETTLED' | 'CANCELLED'

export interface PaymentDocumentListItem {
  id: number
  requestId: number
  partner: { id: number; name: string }
  expenseType: string
  invoiceNo: string | null
  reference: PaymentReference
  containerNo: string | null
  remarks: string | null
  currency: string
  amount: number
  paidAmount: number
  balance: number
  status: DocStatus
  canMarkPaid: boolean
  /** Only while nothing is paid on it. */
  canCancel: boolean
  cancelReason: string | null
}

export interface PaymentDocumentSummary {
  byStatus: Record<DocStatus, number>
  dueByCurrency: Array<{ currency: string; due: number; paid: number; total: number }>
  paidThisMonth: Array<{ currency: string; amount: number; count: number }>
}

export interface Pop {
  id: number
  type: 'FULL' | 'SPLIT'
  amount: number
  currency: string
  paymentDate: string
  reference: string | null
  baseCurrency: string
  baseAmount: number
  fxRateApplied: number
  fxRateSuggested: number | null
  /** The bank the payment left from; `baseCurrency` is its currency. Null on payments recorded before banks were picked. */
  bankProfile: { id: number; name: string; currency: string } | null
  processedBy: UserRef
  /** Oldest first. */
  documents: FinanceDocument[]
  /** The first proof recorded on the payment: it stays on record and cannot be removed. */
  initialDocumentId: string | null
}

export interface PaymentDocumentDetail {
  id: number
  status: DocStatus
  currency: string
  amount: number
  paidAmount: number
  balance: number
  baseCurrency: string
  canMarkPaid: boolean
  markedPaidBy: UserRef | null
  markedPaidAt: string | null
  /** Why it was closed with a balance outstanding (AMOUNT_SETTLED). */
  settledReason: string | null
  canCancel: boolean
  /** Why finance cancelled it (CANCELLED). */
  cancelReason: string | null
  cancelledBy: UserRef | null
  cancelledAt: string | null
  pops: Pop[]
  paymentMethod: { id: number; type: 'BANK' | 'CARD_LINK'; ibanLast4: string | null; accountNumberLast4: string | null; paymentLink: string | null } | null
  request: {
    id: number
    invoiceNo: string | null
    reference: PaymentReference
    containerNo: string | null
    remarks: string | null
    partner: { id: number; name: string }
    /** Display name of what it is booked to: the L4 cost center's path (or, on older records, the expense type). */
  expenseType: { id: number; name: string }
  costCenter: CostCenterOption | null
    /** Documents the requester attached to the request. */
    documents: FinanceDocument[]
  }
}

export interface BankDetails {
  type: 'BANK' | 'CARD_LINK'
  iban: string | null
  accountNumber: string | null
  swiftCode: string | null
  routingNo: string | null
  accountHolder: string | null
  paymentLink: string | null
}

export interface FxQuote {
  from: string
  to: string
  rate: number
  asOf: string
}

export interface PopResult {
  popId: number
  status: DocStatus
  paidAmount: number
  balance: number
}

export interface PartnerRemoval {
  removed: number[]
  skipped: Array<{ id: number; name: string; reason: string }>
}

/* ─────────────── Endpoints ─────────────── */

export const financeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    /* partners */
    getPartners: b.query<Page<PartnerListItem>, PartnerListParams>({
      query: ({ search, ...params }) => ({ url: '/finance/partners', params: { ...params, search: search || undefined } }),
      providesTags: ['FinancePartners'],
    }),
    getPartnerOptions: b.query<PartnerOption[], string | void>({
      query: (search) => ({ url: '/finance/partners/options', params: { search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['FinancePartners'],
    }),
    getPartner: b.query<PartnerDetail, number>({
      query: (id) => `/finance/partners/${id}`,
      transformResponse: unwrap,
      providesTags: ['FinancePartners'],
    }),
    checkPartnerName: b.query<Array<{ id: number; name: string; type: PartnerType }>, string>({
      query: (name) => ({ url: '/finance/partners/name-check', params: { name } }),
      transformResponse: unwrap,
    }),
    /** The partner with the payment methods added on the form, in one transaction (no documents). */
    createPartner: b.mutation<PartnerDetail, Record<string, unknown>>({
      query: (body) => ({ url: '/finance/partners', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinancePartners'],
    }),
    updatePartner: b.mutation<PartnerDetail, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/finance/partners/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinancePartners'],
    }),
    deletePartner: b.mutation<void, number>({
      query: (id) => ({ url: `/finance/partners/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FinancePartners'],
    }),
    /** Deletes those nothing refers to; `skipped` says why each other one was kept. */
    deletePartners: b.mutation<PartnerRemoval, number[]>({
      query: (ids) => ({ url: '/finance/partners/bulk-delete', method: 'POST', body: { ids } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinancePartners'],
    }),
    addPaymentMethod: b.mutation<PaymentMethod, { partnerId: number; body: FormData }>({
      query: ({ partnerId, body }) => ({ url: `/finance/partners/${partnerId}/payment-methods`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinancePartners'],
    }),
    removePaymentMethod: b.mutation<void, { partnerId: number; methodId: number }>({
      query: ({ partnerId, methodId }) => ({ url: `/finance/partners/${partnerId}/payment-methods/${methodId}`, method: 'DELETE' }),
      invalidatesTags: ['FinancePartners'],
    }),

    /* bank profiles */
    getBankProfiles: b.query<Page<BankProfile>, BankProfileListParams>({
      query: ({ search, ...params }) => ({ url: '/finance/bank-profiles', params: { ...params, search: search || undefined } }),
      providesTags: ['FinanceBankProfiles'],
    }),
    createBankProfile: b.mutation<BankProfile, FormData>({
      query: (body) => ({ url: '/finance/bank-profiles', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceBankProfiles'],
    }),
    updateBankProfile: b.mutation<BankProfile, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/finance/bank-profiles/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceBankProfiles'],
    }),
    addBankProfileDocuments: b.mutation<FinanceDocument[], { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `/finance/bank-profiles/${id}/documents`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceBankProfiles'],
    }),
    deleteBankProfile: b.mutation<void, number>({
      query: (id) => ({ url: `/finance/bank-profiles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceBankProfiles'],
    }),

    /* expense types, lookups */
    getExpenseTypes: b.query<ExpenseType[], { includeInactive?: boolean } | void>({
      query: (params) => ({ url: '/finance/expense-types', params: params?.includeInactive ? { includeInactive: 'true' } : undefined }),
      transformResponse: unwrap,
      providesTags: ['FinanceExpenseTypes'],
    }),
    createExpenseType: b.mutation<ExpenseType, { name: string }>({
      query: (body) => ({ url: '/finance/expense-types', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceExpenseTypes'],
    }),
    updateExpenseType: b.mutation<ExpenseType, { id: number; patch: Partial<Pick<ExpenseType, 'name' | 'isActive'>> }>({
      query: ({ id, patch }) => ({ url: `/finance/expense-types/${id}`, method: 'PATCH', body: patch }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceExpenseTypes'],
    }),
    deleteExpenseType: b.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/finance/expense-types/${id}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceExpenseTypes'],
    }),
    getFinanceMarketplaces: b.query<Marketplace[], void>({
      query: () => '/finance/marketplaces',
      transformResponse: unwrap,
    }),

    /* approvers */
    getApproverStatus: b.query<{
      isApprover: boolean
      canManageExpenseTypes: boolean
      canManageApprovers: boolean
      canWritePartners: boolean
      canWriteBankProfiles: boolean
      canWriteCostCenters: boolean
      canCreateRequests: boolean
      canProcessPayments: boolean
    }, void>({
      query: () => '/finance/approvers/me',
      transformResponse: unwrap,
      providesTags: ['FinanceApprovers'],
    }),
    getApprovers: b.query<Approver[], void>({
      query: () => '/finance/approvers',
      transformResponse: unwrap,
      providesTags: ['FinanceApprovers'],
    }),
    getApproverCandidates: b.query<UserCandidate[], string | void>({
      query: (search) => ({ url: '/finance/approvers/candidates', params: { search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['FinanceApprovers'],
    }),
    addApprover: b.mutation<void, number>({
      query: (userId) => ({ url: '/finance/approvers', method: 'POST', body: { userId } }),
      invalidatesTags: ['FinanceApprovers'],
    }),
    removeApprover: b.mutation<void, number>({
      query: (userId) => ({ url: `/finance/approvers/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceApprovers'],
    }),

    /* payment requests */
    getPaymentRequests: b.query<Page<PaymentRequestListItem>, PaymentRequestListParams>({
      query: ({ search, ...params }) => ({ url: '/finance/payment-requests', params: { ...params, search: search || undefined } }),
      providesTags: ['FinanceRequests'],
    }),
    getPaymentRequestSummary: b.query<PaymentRequestSummary, Omit<PaymentRequestListParams, 'page' | 'limit' | 'status'>>({
      query: ({ search, ...params }) => ({ url: '/finance/payment-requests/summary', params: { ...params, search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['FinanceRequests'],
    }),
    getPaymentRequest: b.query<PaymentRequestDetail, number>({
      query: (id) => `/finance/payment-requests/${id}`,
      transformResponse: unwrap,
      providesTags: ['FinanceRequests'],
    }),
    /** Approved, open POs of the chosen supplier, for purchase-order requests. */
    getPayablePurchaseOrders: b.query<PayablePurchaseOrder[], { partnerId: number; search?: string }>({
      query: ({ partnerId, search }) => ({ url: '/finance/payment-requests/purchase-order-options', params: { partnerId, search: search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['ProcurementPurchaseOrders'],
    }),
    /** What has already been requested and paid against a PO (its own requests and its invoices'). */
    getPurchaseOrderPayments: b.query<PurchaseOrderPayment[], { purchaseOrderId: number; excludeId?: number }>({
      query: (params) => ({ url: '/finance/payment-requests/purchase-order-payments', params }),
      transformResponse: unwrap,
      providesTags: ['FinanceRequests'],
    }),
    /** The carrier's FBA shipments (booked with it at the carrier step), for shipment requests. */
    getCarrierShipments: b.query<CarrierShipment[], { partnerId: number }>({
      query: (params) => ({ url: '/finance/payment-requests/shipment-options', params }),
      transformResponse: unwrap,
    }),
    getPayableInvoices: b.query<PurchaseInvoiceForPayment[], { partnerId: number }>({
      query: (params) => ({ url: '/finance/payment-requests/payable-invoices', params }),
      transformResponse: unwrap,
    }),
    checkDuplicateInvoice: b.query<DuplicateInvoice | null, { partnerId: number; invoiceNo: string; excludeId?: number }>({
      query: (params) => ({ url: '/finance/payment-requests/duplicate-check', params }),
      transformResponse: unwrap,
    }),
    /** Is this invoice number one of our purchase invoices, and is it approved and still owing? */
    /** Active L4 cost centers, with their paths, for the expense picker and the list filter. */
    getLeafCostCenters: b.query<CostCenterOption[], void>({
      query: () => '/finance/cost-centers/leaf-options',
      transformResponse: unwrap,
      providesTags: ['FinanceCostCenters'],
    }),
    checkPurchaseInvoice: b.query<PurchaseInvoiceForPayment | null, { partnerId: number; invoiceNo: string }>({
      query: (params) => ({ url: '/finance/payment-requests/invoice-check', params }),
      transformResponse: unwrap,
    }),
    createPaymentRequest: b.mutation<PaymentRequestDetail, FormData>({
      query: (body) => ({ url: '/finance/payment-requests', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),
    updatePaymentRequest: b.mutation<PaymentRequestDetail, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/finance/payment-requests/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),
    addRequestDocuments: b.mutation<FinanceDocument[], { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `/finance/payment-requests/${id}/documents`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),
    removeRequestDocument: b.mutation<void, { id: number; documentId: string }>({
      query: ({ id, documentId }) => ({ url: `/finance/payment-requests/${id}/documents/${documentId}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceRequests'],
    }),
    /** `confirmExcess`: the requester agreed to pay more than the invoice has left. */
    submitPaymentRequest: b.mutation<PaymentRequestDetail, { id: number; confirmExcess?: boolean }>({
      query: ({ id, confirmExcess }) => ({ url: `/finance/payment-requests/${id}/submit`, method: 'POST', body: { confirmExcess } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),
    withdrawPaymentRequest: b.mutation<PaymentRequestDetail, number>({
      query: (id) => ({ url: `/finance/payment-requests/${id}/withdraw`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),
    approvePaymentRequest: b.mutation<PaymentRequestDetail, { id: number; note?: string }>({
      query: ({ id, note }) => ({ url: `/finance/payment-requests/${id}/approve`, method: 'POST', body: { note } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests', 'FinanceProcess'],
    }),
    rejectPaymentRequest: b.mutation<PaymentRequestDetail, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/finance/payment-requests/${id}/reject`, method: 'POST', body: { reason } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceRequests'],
    }),

    /* cashflow planning */
    getCashflowPlanning: b.query<CashflowReport, CashflowParams>({
      query: ({ currencies, ...params }) => ({ url: '/finance/cashflow-planning', params: { ...params, currencies: csv(currencies) } }),
      transformResponse: unwrap,
      // Moves whenever a payment is recorded
      providesTags: ['FinanceProcess'],
    }),

    /* partner aging */
    getPartnerAging: b.query<PartnerAgingReport, void>({
      query: () => '/finance/partner-aging',
      transformResponse: unwrap,
      // Moves whenever a request is raised, approved or paid
      providesTags: ['FinanceRequests', 'FinanceProcess'],
    }),

    /* payment process */
    getPaymentDocuments: b.query<Page<PaymentDocumentListItem>, PageParams & { status?: DocStatus }>({
      query: ({ search, ...params }) => ({ url: '/finance/payment-documents', params: { ...params, search: search || undefined } }),
      providesTags: ['FinanceProcess'],
    }),
    getPaymentDocumentSummary: b.query<PaymentDocumentSummary, { search?: string } | void>({
      query: (params) => ({ url: '/finance/payment-documents/summary', params: { search: params?.search || undefined } }),
      transformResponse: unwrap,
      providesTags: ['FinanceProcess'],
    }),
    getPaymentDocument: b.query<PaymentDocumentDetail, number>({
      query: (id) => `/finance/payment-documents/${id}`,
      transformResponse: unwrap,
      providesTags: ['FinanceProcess'],
    }),
    getFxToday: b.query<FxQuote, { from: string; to?: string }>({
      query: (params) => ({ url: '/finance/fx-rates/today', params }),
      transformResponse: unwrap,
    }),
    addPop: b.mutation<PopResult, { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `/finance/payment-documents/${id}/pops`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceProcess', 'FinanceRequests'],
    }),
    /** Proof documents stay correctable after a payment is marked paid. */
    addPopDocuments: b.mutation<FinanceDocument[], { id: number; popId: number; body: FormData }>({
      query: ({ id, popId, body }) => ({ url: `/finance/payment-documents/${id}/pops/${popId}/documents`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceProcess'],
    }),
    removePopDocument: b.mutation<void, { id: number; popId: number; documentId: string }>({
      query: ({ id, popId, documentId }) => ({ url: `/finance/payment-documents/${id}/pops/${popId}/documents/${documentId}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceProcess'],
    }),
    /** The reference also stays correctable after a payment is marked paid; `null` clears it. */
    updatePopReference: b.mutation<Pick<Pop, 'id' | 'reference'>, { id: number; popId: number; reference: string | null }>({
      query: ({ id, popId, reference }) => ({ url: `/finance/payment-documents/${id}/pops/${popId}`, method: 'PATCH', body: { reference } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceProcess'],
    }),
    /** With a balance still outstanding it settles the amount, which needs `reason`. */
    markPaid: b.mutation<PaymentDocumentDetail, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/finance/payment-documents/${id}/mark-paid`, method: 'POST', body: reason ? { reason } : {} }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceProcess', 'FinanceRequests'],
    }),
    /** Only while nothing is paid on it; the reason is required. */
    cancelPayment: b.mutation<PaymentDocumentDetail, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `/finance/payment-documents/${id}/cancel`, method: 'POST', body: { reason } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceProcess', 'FinanceRequests'],
    }),
    revealBankDetails: b.mutation<BankDetails, number>({
      query: (id) => ({ url: `/finance/payment-documents/${id}/bank-details`, method: 'POST' }),
      transformResponse: unwrap,
    }),
  }),
})

export const {
  useGetPartnersQuery,
  useGetPartnerOptionsQuery,
  useGetPartnerQuery,
  useLazyCheckPartnerNameQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
  useDeletePartnersMutation,
  useAddPaymentMethodMutation,
  useRemovePaymentMethodMutation,
  useGetBankProfilesQuery,
  useCreateBankProfileMutation,
  useUpdateBankProfileMutation,
  useAddBankProfileDocumentsMutation,
  useDeleteBankProfileMutation,
  useGetExpenseTypesQuery,
  useCreateExpenseTypeMutation,
  useUpdateExpenseTypeMutation,
  useDeleteExpenseTypeMutation,
  useGetFinanceMarketplacesQuery,
  useGetApproverStatusQuery,
  useGetApproversQuery,
  useGetApproverCandidatesQuery,
  useAddApproverMutation,
  useRemoveApproverMutation,
  useGetPaymentRequestsQuery,
  useGetPaymentRequestSummaryQuery,
  useGetPaymentRequestQuery,
  useLazyCheckDuplicateInvoiceQuery,
  useLazyCheckPurchaseInvoiceQuery,
  useGetPayableInvoicesQuery,
  useGetCarrierShipmentsQuery,
  useGetPurchaseOrderPaymentsQuery,
  useGetLeafCostCentersQuery,
  useGetPayablePurchaseOrdersQuery,
  useAddPopDocumentsMutation,
  useRemovePopDocumentMutation,
  useUpdatePopReferenceMutation,
  useCreatePaymentRequestMutation,
  useUpdatePaymentRequestMutation,
  useAddRequestDocumentsMutation,
  useRemoveRequestDocumentMutation,
  useSubmitPaymentRequestMutation,
  useWithdrawPaymentRequestMutation,
  useApprovePaymentRequestMutation,
  useRejectPaymentRequestMutation,
  useGetPaymentDocumentsQuery,
  useGetPaymentDocumentSummaryQuery,
  useGetPaymentDocumentQuery,
  useGetFxTodayQuery,
  useAddPopMutation,
  useMarkPaidMutation,
  useCancelPaymentMutation,
  useRevealBankDetailsMutation,
  useGetPartnerAgingQuery,
  useGetCashflowPlanningQuery,
} = financeApi
