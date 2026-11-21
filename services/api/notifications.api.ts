import { baseApi } from './baseApi'

export interface AppNotification {
  id: number
  category: string
  type: string
  title: string
  body: string | null
  link: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
  /** Screen-facing name of `category`, e.g. "Purchase order". */
  categoryLabel?: string
  /** Who triggered it; null for system reminders. */
  actor?: { id: number; name: string } | null
}

export interface NotificationListParams {
  page: number
  limit: number
  unreadOnly?: boolean
  /** Category keys, e.g. `procurement.purchase-order`. */
  categories?: string[]
  actorIds?: string[]
  from?: string
  to?: string
  search?: string
}

export interface NotificationFilterOptions {
  categories: Array<{ id: string; name: string }>
  actors: Array<{ id: string; name: string }>
}

export interface NotificationPage {
  success: boolean
  data: AppNotification[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getNotifications: b.query<NotificationPage, NotificationListParams>({
      query: ({ categories, actorIds, unreadOnly, ...params }) => ({
        url: '/notifications',
        params: {
          ...params,
          ...(unreadOnly ? { unreadOnly: 'true' } : {}),
          ...(categories?.length ? { categories: categories.join(',') } : {}),
          ...(actorIds?.length ? { actorIds: actorIds.join(',') } : {}),
        },
      }),
      providesTags: ['Notifications'],
    }),
    getNotificationFilters: b.query<NotificationFilterOptions, void>({
      query: () => '/notifications/filters',
      providesTags: ['Notifications'],
    }),
    getUnreadCount: b.query<number, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (response: { count: number }) => response.count,
      providesTags: ['Notifications'],
    }),
    markNotificationRead: b.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: b.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetNotificationFiltersQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi
