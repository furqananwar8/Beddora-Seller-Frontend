import { baseApi } from './baseApi'

export type ReportType = 'profit' | 'inventory' | 'ppc' | 'returns'
export type ReportFormat = 'csv' | 'excel' | 'pdf'
export type ReportSchedule = 'daily' | 'weekly' | 'monthly'

export interface ReportFilters {
  accountId: string
  amazonAccountId?: string
  marketplaceId?: string
  sku?: string
  campaignId?: string
  startDate?: string
  endDate?: string
  metrics?: string[]
}

export interface ExportReportRequest {
  reportType: ReportType
  format: ReportFormat
  filters: ReportFilters
}

export interface ScheduledReport {
  id: string
  accountId: string
  userId: string
  reportType: ReportType
  filters: ReportFilters
  schedule: ReportSchedule
  emailRecipients: string[]
  lastRunAt?: string | null
  nextRunAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateScheduledReportRequest {
  accountId: string
  reportType: ReportType
  schedule: ReportSchedule
  filters: ReportFilters
  emailRecipients: string[]
}

export interface UpdateScheduledReportRequest {
  reportType?: ReportType
  schedule?: ReportSchedule
  filters?: ReportFilters
  emailRecipients?: string[]
}

export interface ScheduledReportsResponse {
  success: boolean
  data: ScheduledReport[]
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    exportReport: builder.query<Blob, ExportReportRequest>({
      query: ({ reportType, format, filters }) => ({
        url: '/reports/export',
        params: {
          reportType,
          format,
          ...filters,
        },
        responseHandler: (response) => response.blob(),
      }),
      providesTags: ['Reports'],
      keepUnusedDataFor: 0,
    }),
    getScheduledReports: builder.query<ScheduledReport[], { accountId: string }>({
      query: ({ accountId }) => ({
        url: '/reports/schedules',
        params: { accountId },
      }),
      transformResponse: (response: ScheduledReportsResponse) => response.data,
      providesTags: ['Reports'],
    }),
    createScheduledReport: builder.mutation<ScheduledReport, CreateScheduledReportRequest>({
      query: (payload) => ({
        url: '/reports/schedule',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Reports'],
    }),
    updateScheduledReport: builder.mutation<
      ScheduledReport,
      { id: string; data: UpdateScheduledReportRequest }
    >({
      query: ({ id, data }) => ({
        url: `/reports/schedule/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Reports'],
    }),
    deleteScheduledReport: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/reports/schedule/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reports'],
    }),
  }),
})

export const {
  useLazyExportReportQuery,
  useGetScheduledReportsQuery,
  useCreateScheduledReportMutation,
  useUpdateScheduledReportMutation,
  useDeleteScheduledReportMutation,
} = reportsApi

