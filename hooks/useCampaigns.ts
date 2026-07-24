import {
  useGetCampaignsQuery,
  useGetCampaignsListQuery,
  useUpdateCampaignScheduleMutation,
  useClearCampaignWeeklyScheduleMutation,
  useUpdateCampaignWeeklyScheduleMutation,
  useSyncCampaignSchedulesNowMutation,
} from '../services/api/campaigns.api'
import type {
  GetCampaignsParams,
  CampaignListParams,
  UpdateCampaignSchedulePayload,
  WeeklySchedulePayload,
} from '../services/api/campaigns.api'

// ============================================
// CURSOR-BASED QUERY (dayparting sidebar)
// ============================================

export type UseCampaignsOptions = GetCampaignsParams

export function useCampaigns(options: UseCampaignsOptions) {
  const { type, cursor, limit = 15, search, state } = options
  const isSearchActive = !!search && search.trim().length > 0

  const query = useGetCampaignsQuery(
    { type, cursor, limit, search, state },
    { refetchOnMountOrArgChange: isSearchActive }
  )

  // Mutations
  const [updateSchedule, updateScheduleMeta] = useUpdateCampaignScheduleMutation()
  const [clearSchedule, clearScheduleMeta] = useClearCampaignWeeklyScheduleMutation()
  const [updateWeeklySchedule, updateWeeklyScheduleMeta] = useUpdateCampaignWeeklyScheduleMutation()
  const [syncNow, syncNowMeta] = useSyncCampaignSchedulesNowMutation()

  return {
    // ---- Query state ----
    campaigns: query.data?.campaigns ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isFetching && !query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,

    // ---- Mutations ----
    updateSchedule: (campaignId: number, payload: UpdateCampaignSchedulePayload) =>
      updateSchedule({ campaignId, payload }),

    clearSchedule: (campaignId: number) =>
      clearSchedule(campaignId),

    updateWeeklySchedule: (campaignId: number, schedules: WeeklySchedulePayload[]) =>
      updateWeeklySchedule({ campaignId, body: { schedules } }),

    syncNow: () => syncNow(),

    // ---- Mutation meta (isLoading / isSuccess / error / reset) ----
    updateScheduleMeta,
    clearScheduleMeta,
    updateWeeklyScheduleMeta,
    syncNowMeta,
  }
}

// ============================================
// PAGE-BASED QUERY (admin / legacy listing)
// ============================================

export function useCampaignsList(options: CampaignListParams = {}) {
  const { page = 1, limit = 20, state } = options

  const query = useGetCampaignsListQuery({ page, limit, state })

  // Mutations (re-used from above)
  const [updateSchedule, updateScheduleMeta] = useUpdateCampaignScheduleMutation()
  const [clearSchedule, clearScheduleMeta] = useClearCampaignWeeklyScheduleMutation()
  const [updateWeeklySchedule, updateWeeklyScheduleMeta] = useUpdateCampaignWeeklyScheduleMutation()
  const [syncNow, syncNowMeta] = useSyncCampaignSchedulesNowMutation()

  return {
    campaigns: query.data?.campaigns ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    totalPages: query.data?.totalPages ?? 0,
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isFetching && !query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,

    // Mutations
    updateSchedule: (campaignId: number, payload: UpdateCampaignSchedulePayload) =>
    updateSchedule({ campaignId, payload }),
    clearSchedule: (campaignId: number) => clearSchedule(campaignId),
    updateWeeklySchedule: (campaignId: number, schedules: WeeklySchedulePayload[]) =>
      updateWeeklySchedule({ campaignId, body: { schedules } }),
    syncNow: () => syncNow(),

    // Meta
    updateScheduleMeta,
    clearScheduleMeta,
    updateWeeklyScheduleMeta,
    syncNowMeta,
  }
}