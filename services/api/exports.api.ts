import { baseApi } from './baseApi'
import { Envelope, unwrap } from './finance.api'

export type ExportFormat = 'xlsx' | 'csv'

/** Keys of the reports the API can export (`POST /exports`). */
export type ExportReport = 'profit-by-product' | 'inventory-planner' | 'products-cogs' | 'channel-report-listings' | 'break-even-analysis'

export interface ExportRequest {
  report: ExportReport
  format: ExportFormat
  /** The same filters the report's table sends to its own endpoint. */
  filters: Record<string, unknown>
}

/** `data` of the `export.ready` / `export.failed` realtime events. */
export type ExportEventData = {
  jobId: string
  report: ExportReport
  fileName?: string
  downloadPath?: string
}

export const exportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    requestExport: builder.mutation<{ jobId: string }, ExportRequest>({
      query: (body) => ({ url: '/exports', method: 'POST', body }),
      transformResponse: (response: Envelope<{ jobId: string }>) => unwrap(response),
    }),
  }),
})

export const { useRequestExportMutation } = exportsApi
