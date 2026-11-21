import { baseApi } from './baseApi'

export interface ActivityEntry {
  id: number
  userId: number | null
  user: { id: number; name: string } | null
  screen: string
  action: string
  method: string
  path: string
  entityType: string | null
  entityId: string | null
  summary: string
  statusCode: number
  ip: string | null
  metadata: { changedFields?: string[] } | null
  createdAt: string
}

export interface ActivityPage {
  success: boolean
  data: ActivityEntry[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export interface ActivityListParams {
  page: number
  limit: number
  userIds?: string[]
  screens?: string[]
  actions?: string[]
  from?: string
  to?: string
  search?: string
}

export interface ActivityFilterOptions {
  users: Array<{ id: string; name: string }>
  screens: Array<{ id: string; name: string }>
  actions: Array<{ id: string; name: string }>
}

export const activityApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getActivity: b.query<ActivityPage, ActivityListParams>({
      query: ({ userIds, screens, actions, ...params }) => ({
        url: '/admin/activity',
        params: {
          ...params,
          ...(userIds?.length ? { userIds: userIds.join(',') } : {}),
          ...(screens?.length ? { screens: screens.join(',') } : {}),
          ...(actions?.length ? { actions: actions.join(',') } : {}),
        },
      }),
    }),
    getActivityFilters: b.query<ActivityFilterOptions, void>({
      query: () => '/admin/activity/filters',
    }),
    getActivityEntry: b.query<ActivityEntry, number>({
      query: (id) => `/admin/activity/${id}`,
      transformResponse: (response: { data: ActivityEntry }) => response.data,
    }),
  }),
})

export const { useGetActivityQuery, useGetActivityFiltersQuery, useGetActivityEntryQuery } = activityApi
