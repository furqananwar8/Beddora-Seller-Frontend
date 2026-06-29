import { baseApi } from './baseApi'

/**
 * Tracking & Stats API endpoints
 * 
 * Manages email interaction tracking and review statistics
 */

export type EmailEventType = 'open' | 'click' | 'bounce' | 'delivered'

export interface EmailInteractionMetadata {
  clickedLink?: string
  userAgent?: string
  ipAddress?: string
  location?: string
  device?: string
  [key: string]: any
}

export interface EmailStatsFilters {
  accountId?: string
  marketplaceId?: string
  templateId?: string
  productId?: string
  sku?: string
  startDate?: string
  endDate?: string
  purchaseType?: string
}

export interface EmailStatsResponse {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalFailed: number
  openRate: number
  clickRate: number
  bounceRate: number
  deliveryRate: number
  byTemplate?: Array<{
    templateId: string
    templateName: string
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    openRate: number
    clickRate: number
  }>
  byDate?: Array<{
    date: string
    sent: number
    delivered: number
    opened: number
    clicked: number
  }>
  trends?: {
    openRateTrend: number[]
    clickRateTrend: number[]
  }
}

export interface ReviewStatsFilters {
  accountId?: string
  marketplaceId?: string
  templateId?: string
  productId?: string
  asin?: string
  sku?: string
  startDate?: string
  endDate?: string
}

export interface ReviewStatsResponse {
  totalSent: number
  totalReceived: number
  totalPositive: number
  totalNegative: number
  averageResponseTime: number
  responseRate: number
  positiveRate: number
  byTemplate?: Array<{
    templateId: string
    templateName: string
    sent: number
    received: number
    positive: number
    negative: number
    responseRate: number
    positiveRate: number
  }>
  byProduct?: Array<{
    productId: string
    productTitle: string
    asin: string | null
    sku: string | null
    sent: number
    received: number
    positive: number
    negative: number
    responseRate: number
    positiveRate: number
  }>
  byDate?: Array<{
    date: string
    sent: number
    received: number
    positive: number
    negative: number
  }>
  trends?: {
    responseRateTrend: number[]
    positiveRateTrend: number[]
  }
}

export interface TrackEmailInteractionRequest {
  emailQueueId: string
  eventType: EmailEventType
  metadata?: EmailInteractionMetadata
}

export interface UpdateReviewStatsRequest {
  templateId: string
  accountId?: string
  marketplaceId?: string
  productId?: string
  asin?: string
  sku?: string
  reviewReceived?: boolean
  isPositive?: boolean
  responseTimeHours?: number
}

export const trackingStatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get email interaction statistics
     */
    getEmailStats: builder.query<{ data: EmailStatsResponse }, EmailStatsFilters | void>({
      query: (params) => ({
        url: '/tracking/email',
        ...(params && { params }),
      }),
      providesTags: ['EmailStats'],
    }),

    /**
     * Get email stats for a specific template
     */
    getEmailStatsByTemplate: builder.query<
      { data: EmailStatsResponse },
      { templateId: string; filters?: Omit<EmailStatsFilters, 'templateId'> }
    >({
      query: ({ templateId, filters = {} }) => ({
        url: `/tracking/email/${templateId}`,
        params: filters,
      }),
      providesTags: (result, error, { templateId }) => [
        { type: 'EmailStats', id: templateId },
      ],
    }),

    /**
     * Track an email interaction (webhook/callback)
     */
    trackEmailInteraction: builder.mutation<
      { message: string },
      TrackEmailInteractionRequest
    >({
      query: (body) => ({
        url: '/tracking/email/interaction',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EmailStats', 'EmailQueue'],
    }),

    /**
     * Get review generation statistics
     */
    getReviewStats: builder.query<{ data: ReviewStatsResponse }, ReviewStatsFilters | void>({
      query: (params) => ({
        url: '/tracking/review',
        ...(params && { params }),
      }),
      providesTags: ['EmailStats'],
    }),

    /**
     * Get review stats for a specific product/ASIN
     */
    getReviewStatsByProduct: builder.query<
      { data: ReviewStatsResponse },
      { asin: string; filters?: Omit<ReviewStatsFilters, 'asin'> }
    >({
      query: ({ asin, filters = {} }) => ({
        url: `/tracking/review/${asin}`,
        params: filters,
      }),
      providesTags: (result, error, { asin }) => [{ type: 'EmailStats', id: asin }],
    }),

    /**
     * Update review statistics
     */
    updateReviewStats: builder.mutation<{ message: string }, UpdateReviewStatsRequest>({
      query: (body) => ({
        url: '/tracking/review',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EmailStats'],
    }),
  }),
})

export const {
  useGetEmailStatsQuery,
  useGetEmailStatsByTemplateQuery,
  useTrackEmailInteractionMutation,
  useGetReviewStatsQuery,
  useGetReviewStatsByProductQuery,
  useUpdateReviewStatsMutation,
} = trackingStatsApi

