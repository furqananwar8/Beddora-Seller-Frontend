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
    getNotifications: b.query<NotificationPage, { page: number; limit: number }>({
      query: (params) => ({ url: '/notifications', params }),
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
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi
