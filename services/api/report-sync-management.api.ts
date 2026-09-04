import { baseApi } from './baseApi'

export interface AmazonSyncStateRow {
  id?: number
  syncType: string
  mode: 'live' | 'backfill'
  lastStartDate: string | null
  lastEndDate?: string | null
  status: string
  errorMessage?: string | null
  recordsSynced?: number
  updatedAt?: string
}

export interface GetSyncStatesResponse {
  success: boolean
  data: AmazonSyncStateRow[]
  message?: string
}

export interface ResetSyncItem {
  syncType: string
  mode: 'live' | 'backfill'
  startDate: string
}

export interface ResetSyncRequest {
  items: ResetSyncItem[]
}

export interface ResetSyncResponse {
  success: boolean
  message: string
}

export const reportSyncManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSyncStates: builder.query<GetSyncStatesResponse, void>({
      query: () => '/amazon/sync/states',
      providesTags: ['ReportSyncManagement'],
    }),

    resetSyncState: builder.mutation<ResetSyncResponse, ResetSyncRequest>({
      query: (body) => ({
        url: '/amazon/sync/reset',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ReportSyncManagement'],
    }),
  }),
})

export const {
  useGetSyncStatesQuery,
  useResetSyncStateMutation,
} = reportSyncManagementApi