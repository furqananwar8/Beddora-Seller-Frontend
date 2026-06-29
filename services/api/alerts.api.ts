import { baseApi } from './baseApi'

export type AlertPriority = 'major' | 'minor'
export type AlertStatus = 'unresolved' | 'resolved'
export type AlertType = 'reorder' | 'out_of_stock' | 'image_change' | 'title_change'

export interface Alert {
  id: string
  date: string
  description: string
  productSku: string
  productTitle: string
  productImage: string
  comment?: string
  marketplace: string
  marketplaceCode: string // 'US', 'CA', etc.
  priority: AlertPriority
  resolved: boolean
  type: AlertType
}

export interface AlertSummary {
  major: {
    unresolved: number
    resolved: number
  }
  minor: {
    unresolved: number
    resolved: number
  }
  total: {
    unresolved: number
    resolved: number
  }
}

export interface AlertFilters {
  search?: string
  period?: string
  marketplace?: string
  type?: AlertType | 'all'
  status?: AlertStatus | 'all'
  priority?: AlertPriority | 'all'
}

export const alertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAlertSummary: builder.query<AlertSummary, void>({
      query: () => '/api/alerts/summary',
      providesTags: ['Alerts'],
    }),
    getAlerts: builder.query<Alert[], AlertFilters>({
      query: (filters) => ({
        url: '/api/alerts',
        params: filters,
      }),
      providesTags: ['Alerts'],
    }),
    updateAlert: builder.mutation<Alert, { id: string; resolved: boolean }>({
      query: ({ id, resolved }) => ({
        url: `/api/alerts/${id}`,
        method: 'PUT',
        body: { resolved },
      }),
      invalidatesTags: ['Alerts'],
    }),
    markAllAsResolved: builder.mutation<void, void>({
      query: () => ({
        url: '/api/alerts/mark-all-resolved',
        method: 'POST',
      }),
      invalidatesTags: ['Alerts'],
    }),
  }),
})

export const {
  useGetAlertSummaryQuery,
  useGetAlertsQuery,
  useUpdateAlertMutation,
  useMarkAllAsResolvedMutation,
} = alertsApi
