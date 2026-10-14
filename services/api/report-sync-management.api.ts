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

/** A channel sync (Walmart, later Shopify / Temu): one per data type and mode, covering every market. */
export interface ChannelSyncStateRow {
  /** `channel:syncType:mode`, e.g. `walmart:orders:live` */
  key: string
  channel: string
  syncType: string
  mode: 'live' | 'backfill'
  label: string
  /** `date`: re-reads from a start date; `full`: reads everything on every run, a reset just runs it now. */
  resetKind: 'date' | 'full'
  /** Markets the sync loops over, e.g. ['us', 'ca']. */
  markets: string[]
  status: string
  currentStart: string | null
  lastRunAt: string | null
  recordsSynced: number
  errorMessage: string | null
}

export interface ResetChannelSyncRequest {
  items: { key: string; startDate?: string }[]
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

    getChannelSyncStates: builder.query<ChannelSyncStateRow[], string>({
      query: (channel) => `/channel-sync/${channel}/states`,
      transformResponse: (response: { data: ChannelSyncStateRow[] }) => response.data ?? [],
      providesTags: ['ReportSyncManagement'],
    }),

    resetChannelSyncs: builder.mutation<{ message: string }, ResetChannelSyncRequest>({
      query: (body) => ({ url: '/channel-sync/reset', method: 'POST', body }),
      transformResponse: (response: { data: { message: string } }) => response.data,
      invalidatesTags: ['ReportSyncManagement'],
    }),
  }),
})

export const {
  useGetSyncStatesQuery,
  useResetSyncStateMutation,
  useGetChannelSyncStatesQuery,
  useResetChannelSyncsMutation,
} = reportSyncManagementApi