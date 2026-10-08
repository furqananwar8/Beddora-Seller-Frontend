import { baseApi } from './baseApi'

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
  paymentMethod: string | null
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

export interface BankProfile extends PaymentMethod {
  name: string
  createdBy: { id: number; name: string | null }
}

export interface BankProfileListParams {
  page: number
  limit: number
  search?: string
  type?: PaymentMethod['type']
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
  createdAt: string
  createdBy: UserRef
  updatedBy: UserRef | null
  paymentMethods: PaymentMethod[]
  documents: FinanceDocument[]
}

/* ─────────────── Payment requests ─────────────── */

export type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

/** An existing live request for the same partner and invoice, with what has been paid against it. */
export interface DuplicateInvoice {
  id: number
  status: RequestStatus
  currency: string
  amount: number
  paidAmount: number
  remaining: number
}

/** What a request pays against. */
export type ReferenceType = 'INVOICE' | 'PURCHASE_ORDER'

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
}

export interface PaymentRequestListItem {
  id: number
  referenceType: ReferenceType
  invoiceNo: string | null
  purchaseOrder: PoRef | null
  invoiceDate: string
  containerNo: string | null
  currency: string
  amount: number
  status: RequestStatus
  createdAt: string
  decisionNote: string | null
  remarks: string | null
  partner: { id: number; name: string; type: PartnerType }
  expenseType: { id: number; name: string }
  requestedBy: UserRef
  decidedBy: UserRef | null
  documentCount: number
  payment: { paidAmount: number; remaining: number; status: DocStatus } | null
  /** The viewer may edit this request (their own draft or rejected one). */
  canEdit: boolean
}

export interface PaymentRequestListParams extends PageParams {
  status?: RequestStatus
  /** Only requests paying this purchase order. */
  purchaseOrderId?: number
  expenseTypeId?: number
  dateFrom?: string
  dateTo?: string
  scope?: 'mine' | 'all'
}

export interface PaymentRequestSummary {
  byStatus: Record<RequestStatus, number>
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
  containerNo: string | null
  currency: string
  amount: number
  remarks: string | null
  decisionNote: string | null
  submittedAt: string | null
  decidedAt: string | null
  partner: { id: number; name: string; type: PartnerType; country: string | null; currency: string }
  expenseType: { id: number; name: string }
  marketplace: { id: number; name: string; code?: string } | null
  marketplaceId: number | null
  requestedBy: UserRef
  decidedBy: UserRef | null
  documents: FinanceDocument[]
  events: TimelineEvent[]
  paymentDocument: { id: number; status: DocStatus; currency: string; amount: number; paidAmount: number; balance: number } | null
  can: { edit: boolean; submit: boolean; withdraw: boolean; decide: boolean }
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

export type DocStatus = 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'POP_UPLOADED' | 'PAID'

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
  processedBy: UserRef
  documents: FinanceDocument[]
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
  pops: Pop[]
  paymentMethod: { id: number; type: 'BANK' | 'CARD_LINK'; ibanLast4: string | null; accountNumberLast4: string | null; paymentLink: string | null } | null
  request: {
    id: number
    invoiceNo: string | null
    reference: PaymentReference
    containerNo: string | null
    remarks: string | null
    partner: { id: number; name: string }
    expenseType: { id: number; name: string }
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
    createPartner: b.mutation<PartnerDetail, FormData>({
      query: (body) => ({ url: '/finance/partners', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['FinancePartners'],
    }),
    updatePartner: b.mutation<PartnerDetail, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/finance/partners/${id}`, method: 'PATCH', body }),
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
    checkDuplicateInvoice: b.query<DuplicateInvoice | null, { partnerId: number; invoiceNo: string; excludeId?: number }>({
      query: (params) => ({ url: '/finance/payment-requests/duplicate-check', params }),
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
    submitPaymentRequest: b.mutation<PaymentRequestDetail, number>({
      query: (id) => ({ url: `/finance/payment-requests/${id}/submit`, method: 'POST' }),
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
    markPaid: b.mutation<PaymentDocumentDetail, number>({
      query: (id) => ({ url: `/finance/payment-documents/${id}/mark-paid`, method: 'POST' }),
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
  useAddPaymentMethodMutation,
  useRemovePaymentMethodMutation,
  useGetBankProfilesQuery,
  useCreateBankProfileMutation,
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
  useGetPayablePurchaseOrdersQuery,
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
  useRevealBankDetailsMutation,
} = financeApi
