import { baseApi } from './baseApi'
import type { StagingRow, ImportType, StagingStatus } from '@/store/manualImport.slice'

/**
 * Manual Import API endpoints
 * 
 * RTK Query hooks for manual data import operations
 */

export interface UploadFileRequest {
  file: File
  amazonAccountId: string
  marketplaceId: string
  importType: ImportType
}

export interface UploadFileResponse {
  success: boolean
  message: string
  data: {
    success: boolean
    totalRows: number
    validRows: number
    invalidRows: number
    stagingIds: string[]
    errors?: Array<{
      field: string
      message: string
      value?: any
    }>
  }
}

export interface GetStagingRowsResponse {
  success: boolean
  data: StagingRow[]
}

export interface ApproveRejectRequest {
  amazonAccountId: string
  rowIds: string[]
}

export interface ApproveRejectResponse {
  success: boolean
  message: string
  data: {
    count: number
  }
}

export interface FinalizeRequest {
  amazonAccountId: string
}

export interface FinalizeResponse {
  success: boolean
  message: string
  data: {
    success: boolean
    recordsImported: number
    errors: string[]
  }
}

export const importApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * POST /import/upload
     * Upload and parse CSV/Excel file
     */
    uploadFile: builder.mutation<UploadFileResponse, UploadFileRequest>({
      query: ({ file, amazonAccountId, marketplaceId, importType }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('amazonAccountId', amazonAccountId)
        formData.append('marketplaceId', marketplaceId)
        formData.append('importType', importType)

        return {
          url: '/import/upload',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * GET /import/:type/staging
     * Get staging rows
     */
    getStagingRows: builder.query<
      StagingRow[],
      { type: ImportType; amazonAccountId: string; status?: StagingStatus }
    >({
      query: ({ type, amazonAccountId, status }) => ({
        url: `/import/${type}/staging`,
        method: 'GET',
        params: {
          amazonAccountId,
          status,
        },
      }),
      providesTags: ['AmazonAccounts'],
    }),

    /**
     * PATCH /import/:type/approve
     * Approve staging rows
     */
    approveRows: builder.mutation<
      ApproveRejectResponse,
      { type: ImportType; data: ApproveRejectRequest }
    >({
      query: ({ type, data }) => ({
        url: `/import/${type}/approve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * PATCH /import/:type/reject
     * Reject staging rows
     */
    rejectRows: builder.mutation<
      ApproveRejectResponse,
      { type: ImportType; data: ApproveRejectRequest }
    >({
      query: ({ type, data }) => ({
        url: `/import/${type}/reject`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * POST /import/:type/finalize
     * Finalize import - commit to production
     */
    finalizeImport: builder.mutation<
      FinalizeResponse,
      { type: ImportType; data: FinalizeRequest }
    >({
      query: ({ type, data }) => ({
        url: `/import/${type}/finalize`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),
  }),
})

export const {
  useUploadFileMutation,
  useGetStagingRowsQuery,
  useApproveRowsMutation,
  useRejectRowsMutation,
  useFinalizeImportMutation,
} = importApi

