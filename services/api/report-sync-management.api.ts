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

/** A channel sync (Walmart, Shopify, later Temu): one per data type and mode, covering every market. */
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

/** TikTok Shop authorisation: tokens are kept and renewed by the backend, the seller approves the app once. */
export interface TiktokConnection {
  /** The backend has what it needs to send the seller to authorise (the app's service id). */
  configured: boolean
  status: 'connected' | 'reauth_required' | 'not_connected'
  sellerName: string | null
  shops: { id: string; region: string; name: string | null }[]
  accessExpiresAt: string | null
  refreshExpiresAt: string | null
  lastRefreshedAt: string | null
  lastError: string | null
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

    getTiktokConnection: builder.query<TiktokConnection, void>({
      query: () => '/tiktok-auth/connection',
      transformResponse: (response: { data: TiktokConnection }) => response.data,
      providesTags: ['ReportSyncManagement'],
    }),

    getTiktokConnectUrl: builder.query<string, void>({
      query: () => '/tiktok-auth/connect-url',
      transformResponse: (response: { data: { url: string } }) => response.data.url,
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
  useGetTiktokConnectionQuery,
  useLazyGetTiktokConnectUrlQuery,
  useResetChannelSyncsMutation,
} = reportSyncManagementApi