import { baseApi } from './baseApi'

/**
 * Scheduling Rules API endpoints
 * 
 * Manages email automation scheduling rules for autoresponder
 */

export interface SchedulingRuleConditions {
  firstTimeBuyer?: boolean
  notReturned?: boolean
  minOrderValue?: number
  maxOrderValue?: number
  productCategories?: string[]
  skus?: string[]
  hasReview?: boolean
  noReview?: boolean
  [key: string]: boolean | number | string[] | undefined
}

export interface SchedulingRule {
  id: string
  templateId: string
  userId: string
  accountId: string | null
  marketplaceId: string | null
  productId: string | null
  sku: string | null
  deliveryDelayDays: number
  conditions: SchedulingRuleConditions | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  template?: {
    id: string
    name: string
    subject: string
  }
}

export interface CreateSchedulingRuleRequest {
  templateId: string
  accountId?: string
  marketplaceId?: string
  productId?: string
  sku?: string
  deliveryDelayDays: number
  conditions?: SchedulingRuleConditions
  isActive?: boolean
}

export interface UpdateSchedulingRuleRequest {
  templateId?: string
  accountId?: string | null
  marketplaceId?: string | null
  productId?: string | null
  sku?: string | null
  deliveryDelayDays?: number
  conditions?: SchedulingRuleConditions | null
  isActive?: boolean
}

export interface SchedulingPreview {
  ruleId: string
  ruleName: string
  templateName: string
  estimatedSendDate: string
  conditions: SchedulingRuleConditions | null
  applicableOrders: number
}

export interface GetSchedulingRulesParams {
  accountId?: string
  marketplaceId?: string
  templateId?: string
  isActive?: boolean
}

export const schedulingRulesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all scheduling rules
     */
    getSchedulingRules: builder.query<
      { data: SchedulingRule[] },
      GetSchedulingRulesParams | void
    >({
      query: (params) => ({
        url: '/scheduling-rules',
        ...(params && { params }),
      }),
      providesTags: ['EmailTemplates'],
    }),

    /**
     * Get a single scheduling rule by ID
     */
    getSchedulingRule: builder.query<{ data: SchedulingRule }, string>({
      query: (id) => `/scheduling-rules/${id}`,
      providesTags: (result, error, id) => [{ type: 'EmailTemplates', id }],
    }),

    /**
     * Create a new scheduling rule
     */
    createSchedulingRule: builder.mutation<
      { data: SchedulingRule },
      CreateSchedulingRuleRequest
    >({
      query: (body) => ({
        url: '/scheduling-rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EmailTemplates'],
    }),

    /**
     * Update an existing scheduling rule
     */
    updateSchedulingRule: builder.mutation<
      { data: SchedulingRule },
      { id: string; data: UpdateSchedulingRuleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/scheduling-rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'EmailTemplates', id },
        'EmailTemplates',
      ],
    }),

    /**
     * Delete a scheduling rule
     */
    deleteSchedulingRule: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/scheduling-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmailTemplates'],
    }),

    /**
     * Get preview of scheduled emails
     */
    getSchedulingPreview: builder.query<
      { data: SchedulingPreview[] },
      { accountId?: string; templateId?: string } | void
    >({
      query: (params) => ({
        url: '/scheduling-rules/preview',
        ...(params && { params }),
      }),
    }),
  }),
})

export const {
  useGetSchedulingRulesQuery,
  useGetSchedulingRuleQuery,
  useCreateSchedulingRuleMutation,
  useUpdateSchedulingRuleMutation,
  useDeleteSchedulingRuleMutation,
  useGetSchedulingPreviewQuery,
} = schedulingRulesApi

