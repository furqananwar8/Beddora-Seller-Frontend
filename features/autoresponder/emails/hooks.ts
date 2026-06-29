import {
  useGetEmailTemplatesQuery,
  useCreateEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useSendEmailNowMutation,
  useGetEmailQueueQuery,
  useGetEmailStatsQuery,
} from '@/services/api/emailTemplates.api'

export const useFetchEmailTemplates = useGetEmailTemplatesQuery
export const useCreateEmailTemplate = useCreateEmailTemplateMutation
export const useUpdateEmailTemplate = useUpdateEmailTemplateMutation
export const useDeleteEmailTemplate = useDeleteEmailTemplateMutation
export const useSendEmailNow = useSendEmailNowMutation
export const useFetchEmailQueue = useGetEmailQueueQuery
export const useFetchEmailStats = useGetEmailStatsQuery

