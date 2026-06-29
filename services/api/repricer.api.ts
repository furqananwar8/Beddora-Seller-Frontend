import { baseApi } from './baseApi'

/**
 * Repricer Strategy Types
 */
export type RepricerStrategy =
  | 'competitive' // Match or beat competitor prices
  | 'maximize_profit' // Maintain higher margins
  | 'win_buy_box' // Optimize for Buy Box win rate
  | 'fast_turnover' // Quick inventory turnover
  | 'custom' // User-defined rules

/**
 * Repricing Status
 */
export type RepricingStatus = 'active' | 'paused' | 'error' | 'pending'

/**
 * Buy Box Status
 */
export type BuyBoxStatus = 'won' | 'lost' | 'ineligible' | 'unknown'

/**
 * Repricer Summary Metrics
 */
export interface RepricerSummary {
  totalProducts: number
  activeProducts: number
  pausedProducts: number
  buyBoxWinRate: number
  averagePrice: number
  averageMargin: number
  totalRevenue: number
  revenueChange: number
  priceChanges24h: number
  competitorTracked: number
}

/**
 * Product Repricing Data
 */
export interface ProductRepricingData {
  id: string
  sku: string
  asin: string
  title: string
  currentPrice: number
  minPrice: number
  maxPrice: number
  competitorCount: number
  lowestCompetitorPrice: number
  buyBoxPrice: number
  buyBoxStatus: BuyBoxStatus
  strategy: RepricerStrategy
  status: RepricingStatus
  lastRepriced: string
  priceChangeCount: number
  salesVelocity: number
  currentMargin: number
  roi: number
}

/**
 * Pricing History Entry
 */
export interface PricingHistoryEntry {
  timestamp: string
  price: number
  competitorPrice: number
  buyBoxPrice: number
  sales: number
}

/**
 * Repricer Rule
 */
export interface RepricerRule {
  id: string
  name: string
  strategy: RepricerStrategy
  priority: number
  conditions: {
    minMargin?: number
    maxMargin?: number
    competitorOffset?: number
    buyBoxOffset?: number
  }
  actions: {
    priceAdjustment: 'percentage' | 'fixed'
    value: number
  }
  isActive: boolean
  productsApplied: number
}

/**
 * Competitor Data
 */
export interface CompetitorData {
  sellerId: string
  sellerName: string
  price: number
  shipping: number
  totalPrice: number
  rating: number
  feedbackCount: number
  isPrime: boolean
  isAmazon: boolean
  isBuyBox: boolean
}

/**
 * Repricer Filters
 */
export interface RepricerFilters {
  accountId?: string
  marketplace?: string
  status?: RepricingStatus
  strategy?: RepricerStrategy
  buyBoxStatus?: BuyBoxStatus
  search?: string
  minPrice?: number
  maxPrice?: number
  minMargin?: number
  maxMargin?: number
  startDate?: string
  endDate?: string
}

/**
 * Chart Data Point
 */
export interface RepricerChartDataPoint {
  date: string
  averagePrice: number
  buyBoxWinRate: number
  revenue: number
  margin: number
}

/**
 * Repricer API
 */
export const repricerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get repricer summary metrics
     */
    getRepricerSummary: builder.query<RepricerSummary, RepricerFilters>({
      query: (filters) => ({
        url: '/repricer/summary',
        params: filters,
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Get products with repricing data
     */
    getRepricerProducts: builder.query<ProductRepricingData[], RepricerFilters>({
      query: (filters) => ({
        url: '/repricer/products',
        params: filters,
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Get pricing history for a product
     */
    getPricingHistory: builder.query<
      PricingHistoryEntry[],
      { sku: string; days?: number }
    >({
      query: ({ sku, days = 30 }) => ({
        url: `/repricer/products/${sku}/history`,
        params: { days },
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Get competitor data for a product
     */
    getCompetitors: builder.query<CompetitorData[], { asin: string }>({
      query: ({ asin }) => ({
        url: `/repricer/products/${asin}/competitors`,
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Get repricer rules
     */
    getRepricerRules: builder.query<RepricerRule[], { accountId?: string }>({
      query: (params) => ({
        url: '/repricer/rules',
        params,
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Get repricer chart data
     */
    getRepricerChart: builder.query<RepricerChartDataPoint[], RepricerFilters>({
      query: (filters) => ({
        url: '/repricer/chart',
        params: filters,
      }),
      providesTags: ['Repricer'],
    }),

    /**
     * Update product repricing settings
     */
    updateProductRepricing: builder.mutation<
      void,
      {
        sku: string
        minPrice?: number
        maxPrice?: number
        strategy?: RepricerStrategy
        status?: RepricingStatus
      }
    >({
      query: ({ sku, ...body }) => ({
        url: `/repricer/products/${sku}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Repricer'],
    }),

    /**
     * Bulk update repricing status
     */
    bulkUpdateRepricingStatus: builder.mutation<
      void,
      { skus: string[]; status: RepricingStatus }
    >({
      query: (body) => ({
        url: '/repricer/products/bulk-status',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Repricer'],
    }),

    /**
     * Create/Update repricer rule
     */
    saveRepricerRule: builder.mutation<RepricerRule, Partial<RepricerRule>>({
      query: (rule) => ({
        url: rule.id ? `/repricer/rules/${rule.id}` : '/repricer/rules',
        method: rule.id ? 'PUT' : 'POST',
        body: rule,
      }),
      invalidatesTags: ['Repricer'],
    }),

    /**
     * Delete repricer rule
     */
    deleteRepricerRule: builder.mutation<void, string>({
      query: (ruleId) => ({
        url: `/repricer/rules/${ruleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Repricer'],
    }),

    /**
     * Trigger manual repricing
     */
    triggerManualRepricing: builder.mutation<void, { skus?: string[] }>({
      query: (body) => ({
        url: '/repricer/trigger',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Repricer'],
    }),
  }),
})

export const {
  useGetRepricerSummaryQuery,
  useGetRepricerProductsQuery,
  useGetPricingHistoryQuery,
  useGetCompetitorsQuery,
  useGetRepricerRulesQuery,
  useGetRepricerChartQuery,
  useUpdateProductRepricingMutation,
  useBulkUpdateRepricingStatusMutation,
  useSaveRepricerRuleMutation,
  useDeleteRepricerRuleMutation,
  useTriggerManualRepricingMutation,
} = repricerApi
