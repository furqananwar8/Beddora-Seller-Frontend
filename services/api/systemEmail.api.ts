import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'

export type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED'
/** The list's tabs: every email, or one status. */
export type EmailTab = 'ALL' | EmailStatus

export interface EmailRow {
  id: number
  toAddress: string
  subject: string
  template: string
  /** The template's readable name ("PO approved"). */
  event: string
  status: EmailStatus
  /** Tries made, sent or failed. */
  attempts: number
  lastError: string | null
  createdAt: string
  sentAt: string | null
  /** How many times it was delivered (a resend adds one). */
  sendCount: number
  lastSentAt: string | null
}

export interface EmailSummary {
  all: number
  failed: number
  queued: number
  sent: number
  sentLast24h: number
}

export interface EmailTemplateOption {
  template: string
  label: string
}

export interface EmailListParams {
  page: number
  limit: number
  status: EmailTab
  search?: string
  template?: string
  /** Created from / to, `YYYY-MM-DD`. */
  from?: string
  to?: string
}

export interface EmailAttempt {
  id: number
  outcome: 'SENT' | 'FAILED'
  /** Sent on its own by the queue, or resent by a person. */
  trigger: 'AUTO' | 'MANUAL'
  error: string | null
  by: { id: number; name: string } | null
  at: string
}

export interface EmailHistory extends Pick<EmailRow, 'id' | 'toAddress' | 'subject' | 'template' | 'event' | 'status' | 'sendCount'> {
  firstSentAt: string | null
  lastSentAt: string | null
  /** Every try, newest first. */
  attempts: EmailAttempt[]
}

export interface ResendBody {
  ids?: number[]
  allFailed?: boolean
  /** Also resend emails that were already delivered. Without it they are skipped. */
  includeSent?: boolean
}

export interface ResendResult {
  resent: number
  skippedSent: number
  skippedQueued: number
  notFound: number
}

export interface BacklogEvent {
  key: string
  label: string
  records: number
  alreadyEmailed: number
  notYet: number
  emailsToSend: number
}

export interface EmailBacklog {
  from: string
  events: BacklogEvent[]
  totalEmailsToSend: number
}

export interface BacklogSendBody {
  from: string
  events: string[]
}

export interface BacklogSendResult {
  queued: number
  skipped: number
  remaining: number
}

/** What the realtime topic `system.email` carries: the email as the list shows it, and how this try started. */
export interface EmailLiveEvent extends EmailRow {
  trigger: 'AUTO' | 'MANUAL'
}

const PATH = '/system/emails'

/** Cache tags: the list (with the backlog's own entry), the box counts, and one email's history. */
export const emailTags = {
  list: { type: 'SystemEmail' as const, id: 'LIST' },
  summary: { type: 'SystemEmail' as const, id: 'SUMMARY' },
  backlog: { type: 'SystemEmail' as const, id: 'BACKLOG' },
  history: (id: number) => ({ type: 'SystemEmail' as const, id: `HISTORY-${id}` }),
}

export const systemEmailApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getEmailAccess: b.query<{ allowed: boolean }, void>({
      query: () => `${PATH}/access`,
      transformResponse: unwrap,
      keepUnusedDataFor: 300,
    }),
    getEmailSummary: b.query<EmailSummary, void>({
      query: () => `${PATH}/summary`,
      transformResponse: unwrap,
      providesTags: [emailTags.summary],
    }),
    getEmailTemplates: b.query<EmailTemplateOption[], void>({
      query: () => `${PATH}/templates`,
      transformResponse: unwrap,
      keepUnusedDataFor: 300,
    }),
    getEmails: b.query<Page<EmailRow>, EmailListParams>({
      query: ({ search, template, from, to, ...params }) => ({ url: PATH, params: { ...params, search: search || undefined, template: template || undefined, from: from || undefined, to: to || undefined } }),
      providesTags: [emailTags.list],
    }),
    getEmailHistory: b.query<EmailHistory, number>({
      query: (id) => `${PATH}/${id}/history`,
      transformResponse: unwrap,
      providesTags: (_result, _error, id) => [emailTags.history(id)],
    }),
    resendEmails: b.mutation<ResendResult, ResendBody>({
      query: (body) => ({ url: `${PATH}/resend`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, body) => [emailTags.list, emailTags.summary, ...(body.ids ?? []).map(emailTags.history)],
    }),
    getEmailBacklog: b.query<EmailBacklog, string>({
      query: (from) => ({ url: `${PATH}/backlog`, params: { from } }),
      transformResponse: unwrap,
      providesTags: [emailTags.backlog],
    }),
    sendBacklogEmails: b.mutation<BacklogSendResult, BacklogSendBody>({
      query: (body) => ({ url: `${PATH}/backlog/send`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [emailTags.list, emailTags.summary, emailTags.backlog],
    }),
  }),
})

export const {
  useGetEmailAccessQuery,
  useGetEmailSummaryQuery,
  useGetEmailTemplatesQuery,
  useGetEmailsQuery,
  useGetEmailHistoryQuery,
  useResendEmailsMutation,
  useGetEmailBacklogQuery,
  useSendBacklogEmailsMutation,
} = systemEmailApi
