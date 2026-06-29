import { baseApi } from './baseApi'

export type CaseType = 'lost' | 'damaged' | 'refund_discrepancy'
export type CaseSubmissionStatus = 'draft' | 'submitted' | 'resolved'

export interface ReimbursementCase {
  id: string
  userId: string
  accountId: string | null
  marketplaceId: string
  productId: string | null
  sku: string | null
  caseType: CaseType
  generatedText: string
  submissionStatus: CaseSubmissionStatus
  submissionDate: string | null
  resolutionDate: string | null
  createdAt: string
  updatedAt: string
  marketplace?: { id: string; name: string }
  product?: { id: string; title: string; sku: string }
}

export interface CaseFilters {
  accountId?: string
  marketplaceId?: string
  productId?: string
  sku?: string
  caseType?: CaseType
  submissionStatus?: CaseSubmissionStatus
  startDate?: string
  endDate?: string
}

export interface CreateCaseRequest {
  caseType: CaseType
  marketplaceId: string
  productId?: string
  sku?: string
  sourceId?: string
  customNotes?: string
}

export interface UpdateCaseRequest {
  generatedText?: string
  submissionStatus?: CaseSubmissionStatus
  submissionDate?: string | null
  resolutionDate?: string | null
  notes?: string
}

export const reimbursementCasesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCases: builder.query<{ data: ReimbursementCase[] }, CaseFilters | void>({
      query: (params) => ({
        url: '/reimbursements/cases',
        ...(params && { params }),
      }),
      providesTags: ['ReimbursementCases'],
    }),
    getCase: builder.query<{ data: ReimbursementCase }, string>({
      query: (id) => `/reimbursements/cases/${id}`,
      providesTags: (result, error, id) => [{ type: 'ReimbursementCases', id }],
    }),
    createCase: builder.mutation<{ data: ReimbursementCase }, CreateCaseRequest>({
      query: (body) => ({
        url: '/reimbursements/cases',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ReimbursementCases'],
    }),
    updateCase: builder.mutation<{ data: ReimbursementCase }, { id: string; data: UpdateCaseRequest }>({
      query: ({ id, data }) => ({
        url: `/reimbursements/cases/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ReimbursementCases', id },
        'ReimbursementCases',
      ],
    }),
    getSellerSupportUrl: builder.query<{ data: { url: string } }, void>({
      query: () => '/reimbursements/cases/seller-support',
    }),
  }),
})

export const {
  useGetCasesQuery,
  useGetCaseQuery,
  useCreateCaseMutation,
  useUpdateCaseMutation,
  useGetSellerSupportUrlQuery,
} = reimbursementCasesApi

