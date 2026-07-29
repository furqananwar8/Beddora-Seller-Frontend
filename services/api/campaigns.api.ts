import { baseApi } from './baseApi'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Campaign {
  campaignId: number
  profileId: number
  name: string
  state: string
  adProduct: string
  countryCode: string
  creationDate: string
  marketplaces?: string[]
  schedules?: any[]
}

/** Cursor-based response (used by your dayparting UI) */
export interface CampaignsResponse {
  campaigns: Campaign[]
  nextCursor?: string | null
  total?: number
}

export interface GetCampaignsParams {
  type: 'SPONSORED_PRODUCTS' | 'SPONSORED_BRANDS' | 'SPONSORED_DISPLAY'
  cursor?: string | null
  limit?: number
  search?: string
  state?: string
}

/** Page-based response (legacy/admin listing) */
export interface CampaignListParams {
  page?: number
  limit?: number
  state?: string
}

export interface CampaignListResponse {
  campaigns: Campaign[]
  total: number
  page: number
  totalPages: number
}

/** Schedule payloads — adjust these to match your backend contracts */
export interface WeeklySchedulePayload {
  dayOfWeek: number
  startHour: number
  endHour: number
  enabled?: boolean
}

export interface UpdateCampaignSchedulePayload {
  schedules?: any[]
  campaignName: string
  // Add other fields your backend expects
}

export interface ScheduleResponse {
  success: boolean
  message?: string
  campaignId?: number
}

export interface SyncSchedulesResponse {
  success: boolean
  message?: string
  syncedCount?: number
}


export interface ScheduledJob {
  id: string
  campaignId: string
  campaignName: string
  status: string
  scheduledAt: string
  executedAt?: string
  errorMessage?: string
  // add whatever fields your backend returns
}

export interface GetScheduledJobsParams {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: string
  campaignId?: string
  search?: string
}

export interface ScheduledJobsResponse {
  jobs: ScheduledJob[]
  total: number
  page: number
  totalPages: number
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----------------------------------------
    // Queries
    // ----------------------------------------

    /** Cursor-based campaigns (dayparting sidebar) */
    getCampaigns: builder.query<CampaignsResponse, GetCampaignsParams>({
      query: ({ type, cursor, limit = 15, search, state }) => {
        const params = new URLSearchParams({
          type,
          limit: String(limit),
        })
        if (cursor) params.append('cursor', cursor)
        if (search) params.append('search', search)
        if (state) params.append('state', state)

        return {
          url: `/campaigns?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: (result) => {
        const campaigns = result?.campaigns
        if (!Array.isArray(campaigns) || campaigns.length === 0) {
          return ['Campaigns']
        }
        return [
          ...campaigns.map((c: any) => ({ type: 'Campaigns' as const, id: c.campaignId })),
          'Campaigns',
        ]
      },
      keepUnusedDataFor: 300,
    }),

    /** Page-based campaigns (admin/legacy listing) */
    getCampaignsList: builder.query<CampaignListResponse, CampaignListParams>({
      query: ({ page = 1, limit = 20, state }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })
        if (state) params.append('state', state)

        return {
          url: `/campaigns?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: ['Campaigns'],
      keepUnusedDataFor: 300,
    }),

    // ----------------------------------------
    // Mutations
    // ----------------------------------------

    /** General schedule update (also used for clearing when passing { schedules: [] }) */
    updateCampaignSchedule: builder.mutation<
      ScheduleResponse,
      { campaignId: number; payload: UpdateCampaignSchedulePayload }
    >({
      query: ({ campaignId, payload }) => ({
        url: `/campaigns/${campaignId}/schedule`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaigns', id: campaignId },
        'Campaigns',
      ],
    }),

    /** Convenience mutation that clears schedules by posting an empty array */
    clearCampaignWeeklySchedule: builder.mutation<ScheduleResponse, number>({
      query: (campaignId) => ({
        url: `/campaigns/${campaignId}/schedule`,
        method: 'POST',
        body: { schedules: [] },
      }),
      invalidatesTags: (result, error, campaignId) => [
        { type: 'Campaigns', id: campaignId },
        'Campaigns',
      ],
    }),

    /** Weekly schedule update (separate endpoint) */
    updateCampaignWeeklySchedule: builder.mutation<
      ScheduleResponse,
      { campaignId: number; body: { schedules: WeeklySchedulePayload[] } }
    >({
      query: ({ campaignId, body }) => ({
        url: `/campaigns/${campaignId}/weekly-schedule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaigns', id: campaignId },
        'Campaigns',
      ],
    }),

    /** Trigger immediate sync of all campaign schedules */
    syncCampaignSchedulesNow: builder.mutation<SyncSchedulesResponse, void>({
      query: () => ({
        url: '/campaign-schedules/sync-now',
        method: 'POST',
      }),
      invalidatesTags: ['Campaigns'],
    }),

    getScheduledJobs: builder.query<ScheduledJobsResponse, GetScheduledJobsParams>({
      query: ({ page = 1, limit = 20, status, sortBy, sortOrder, campaignId, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })
        if (status) params.set('status', status)
        if (sortBy) params.set('sortBy', sortBy)
        if (sortOrder) params.set('sortOrder', sortOrder)
        if (campaignId) params.set('campaignId', campaignId)
        if (search) params.set('search', search)

        return {
          url: `/campaigns/scheduled-jobs?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: ['ScheduledJobs'],
      keepUnusedDataFor: 300,
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useGetCampaignsQuery,
  useGetScheduledJobsQuery,
  useLazyGetScheduledJobsQuery,
  useLazyGetCampaignsQuery,
  useGetCampaignsListQuery,
  useLazyGetCampaignsListQuery,
  useUpdateCampaignScheduleMutation,
  useClearCampaignWeeklyScheduleMutation,
  useUpdateCampaignWeeklyScheduleMutation,
  useSyncCampaignSchedulesNowMutation,
} = campaignsApi