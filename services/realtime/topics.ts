import type { TagType } from '@/services/api/baseApi'

/**
 * Every realtime topic the app listens to, and which cached API data goes stale
 * when one of its events arrives. A new event family is one line here; the
 * provider subscribes and invalidates, screens refetch on their own.
 */
export const REALTIME_TOPICS: Record<string, TagType[]> = {
  notification: ['Notifications'],
  'finance.partner': ['FinancePartners'],
  'finance.payment-request': ['FinanceRequests'],
  'finance.payment-process': ['FinanceProcess', 'FinanceRequests'],
}

export interface RealtimeMessage<T = Record<string, unknown>> {
  id: string
  topic: string
  type: string
  data: T
  ts: string
  v: 1
}
