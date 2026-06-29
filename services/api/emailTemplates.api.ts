import { baseApi } from './baseApi'
import { EmailQueueItem, EmailStatsResponse, EmailTemplate } from '@/types/emailTemplates.types'

export const emailTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmailTemplates: builder.query<EmailTemplate[], void>({
      query: () => ({
        url: '/emails/templates',
      }),
      providesTags: ['EmailTemplates'],
      transformResponse: (response: { success: boolean; data: { data: EmailTemplate[] } }) =>
        response.data.data,
    }),
    createEmailTemplate: builder.mutation<EmailTemplate, Partial<EmailTemplate>>({
      query: (payload) => ({
        url: '/emails/templates',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['EmailTemplates'],
      transformResponse: (response: { success: boolean; data: { data: EmailTemplate } }) =>
        response.data.data,
    }),
    updateEmailTemplate: builder.mutation<EmailTemplate, { id: string; payload: Partial<EmailTemplate> }>({
      query: ({ id, payload }) => ({
        url: `/emails/templates/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['EmailTemplates'],
      transformResponse: (response: { success: boolean; data: { data: EmailTemplate } }) =>
        response.data.data,
    }),
    deleteEmailTemplate: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `/emails/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmailTemplates'],
      transformResponse: (response: { success: boolean; data: { success: boolean } }) =>
        response.data,
    }),
    sendEmailNow: builder.mutation<
      EmailQueueItem,
      {
        templateId: string
        recipientEmail: string
        scheduledAt?: string
        variables?: Record<string, string | number | boolean | null>
      }
    >({
      query: (payload) => ({
        url: '/emails/send',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['EmailQueue', 'EmailStats'],
      transformResponse: (response: { success: boolean; data: { data: EmailQueueItem } }) =>
        response.data.data,
    }),
    getEmailQueue: builder.query<EmailQueueItem[], void>({
      query: () => ({
        url: '/emails/queue',
      }),
      providesTags: ['EmailQueue'],
      transformResponse: (response: { success: boolean; data: { data: EmailQueueItem[] } }) =>
        response.data.data,
    }),
    getEmailStats: builder.query<EmailStatsResponse, void>({
      query: () => ({
        url: '/emails/statistics',
      }),
      providesTags: ['EmailStats'],
      transformResponse: (response: { success: boolean; data: EmailStatsResponse }) =>
        response.data,
    }),
  }),
})

export const {
  useGetEmailTemplatesQuery,
  useCreateEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useSendEmailNowMutation,
  useGetEmailQueueQuery,
  useGetEmailStatsQuery,
} = emailTemplatesApi

