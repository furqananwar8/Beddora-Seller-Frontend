import { baseApi } from './baseApi'

/**
 * Profit API endpoints
 * 
 * Provides RTK Query hooks for profit calculations and aggregations
 * Supports real-time profit dashboard with filtering and breakdowns
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Profit filter parameters
 */
export interface ProfitFilters {
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
  sku?: string
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month'
}

/**
 * Profit summary metrics
 */
export interface ProfitSummary {
  salesRevenue: number
  totalExpenses: number
  totalFees: number
  totalRefunds: number
  totalCOGS: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  orderCount: number
  period: {
    startDate: string | null
    endDate: string | null
  }
}

/**
 * Product-level profit breakdown
 */
export interface ProductProfitBreakdown {
  sku: string
  productId: string | null
  productTitle: string | null
  salesRevenue: number
  totalExpenses: number
  totalFees: number
  totalRefunds: number
  totalCOGS: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  unitsSold: number
  orderCount: number
}

/**
 * Marketplace-level profit breakdown
 */
export interface MarketplaceProfitBreakdown {
  marketplaceId: string
  marketplaceName: string
  marketplaceCode: string
  salesRevenue: number
  totalExpenses: number
  totalFees: number
  totalRefunds: number
  totalCOGS: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  orderCount: number
}

/**
 * Order item-level profit breakdown
 */
export interface OrderItemProfitBreakdown {
  id: string
  orderId: string
  orderNumber: string
  orderDate: string
  orderStatus: string
  shipDate?: string | null
  marketplace: string
  marketplaceCode: string
  productId: string
  sku: string
  productTitle: string | null
  productImageUrl: string | null
  unitPrice: number
  quantity: number
  salesRevenue: number
  refundCount: number
  sellableReturnsPercent: number
  amazonFees: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  coupon?: string | null
  comment?: string | null
  currency: string
}

/**
 * Time-series profit trend data
 */
export interface ProfitTrendData {
  date: string
  period: string
  salesRevenue: number
  totalExpenses: number
  totalFees: number
  totalRefunds: number
  totalCOGS: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  orderCount: number
}

/**
 * Profit trends response
 */
export interface ProfitTrendsResponse {
  data: ProfitTrendData[]
  period: 'day' | 'week' | 'month'
  startDate: string
  endDate: string
}

/**
 * API Response wrappers
 */
export interface ProfitSummaryResponse {
  success: boolean
  data: ProfitSummary
}

export interface ProductBreakdownResponse {
  success: boolean
  data: ProductProfitBreakdown[]
  totalRecords: number
}

export interface MarketplaceBreakdownResponse {
  success: boolean
  data: MarketplaceProfitBreakdown[]
  totalRecords: number
}

export interface ProfitTrendsApiResponse {
  success: boolean
  data: ProfitTrendsResponse
}

export interface OrderItemsBreakdownResponse {
  success: boolean
  data: OrderItemProfitBreakdown[]
  totalRecords: number
}

/**
 * P&L (Profit & Loss) types
 */
export interface PLPeriodValue {
  period: string
  value: number
}

export interface PLMetricRow {
  parameter: string
  isExpandable: boolean
  periods: PLPeriodValue[]
  total: number
  children?: PLMetricRow[] // Child metrics for expandable rows
}

export interface PLResponse {
  periods: string[]
  currentPeriod: string
  metrics: PLMetricRow[]
  startDate: string
  endDate: string
}

export interface PLResponseApi {
  success: boolean
  data: PLResponse
}

/**
 * Country-level profit breakdown
 * Used for map visualization
 */
export interface CountryProfitBreakdown {
  country: string // Country code (e.g., "US", "GB", "DE")
  profit: number // Net profit for the country
  orders: number // Number of orders for the country
}

/**
 * Simplified profit trends response
 * Used for Trends screen with simplified chart data format
 */
export interface ProfitTrendsSimpleResponse {
  labels: string[] // Date labels (e.g., ["2026-01-01", "2026-01-02"])
  profit: number[] // Net profit values for each period
  revenue: number[] // Sales revenue values for each period
}

/**
 * Product trend data for a specific date
 */
export interface ProductTrendDateValue {
  date: string // Date in ISO format (YYYY-MM-DD)
  value: number // Metric value for this date
  changePercent: number // Percentage change from previous date
}

/**
 * Product-level trends response
 * Used for Trends screen showing product-level metrics over time
 */
export interface ProductTrendsResponse {
  products: Array<{
    productId: string
    sku: string
    productTitle: string | null
    productImageUrl: string | null
    dailyValues: ProductTrendDateValue[]
    chartData: number[]
  }>
  dates: string[] // All dates in the range (YYYY-MM-DD format)
  metric: string // The metric being displayed
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const profitApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Get profit summary
     * Returns aggregated metrics for a given period
     */
    getProfitSummary: builder.query<ProfitSummary, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/summary',
        params: filters,
      }),
      transformResponse: (response: ProfitSummaryResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - summary data changes less frequently
      keepUnusedDataFor: 120,
    }),

    /**
     * Get profit breakdown by product/SKU
     * Returns profit metrics grouped by SKU
     */
    getProfitByProduct: builder.query<ProductProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-product',
        params: filters,
      }),
      transformResponse: (response: ProductBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 180 seconds - product breakdown data is relatively stable
      keepUnusedDataFor: 180,
    }),

    /**
     * Get profit breakdown by marketplace
     * Returns profit metrics grouped by marketplace
     */
    getProfitByMarketplace: builder.query<MarketplaceProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-marketplace',
        params: filters,
      }),
      transformResponse: (response: MarketplaceBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 180 seconds - marketplace breakdown data is relatively stable
      keepUnusedDataFor: 180,
    }),

    /**
     * Get profit trends over time
     * Returns time-series data for chart visualization
     */
    getProfitTrends: builder.query<ProfitTrendsResponse, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/trends',
        params: filters,
      }),
      transformResponse: (response: ProfitTrendsApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - trend data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),

    /**
     * Get profit breakdown by order items
     * Returns profit metrics for individual order items
     */
    getProfitByOrderItems: builder.query<OrderItemProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-order-items',
        params: filters,
      }),
      transformResponse: (response: OrderItemsBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - order items can change more frequently
      keepUnusedDataFor: 120,
    }),

    /**
     * Get P&L (Profit & Loss) data by periods
     * Returns financial metrics grouped by time periods (current month-to-date + past 12 months)
     */
    getPLByPeriods: builder.query<PLResponse, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/pl',
        params: filters,
      }),
      transformResponse: (response: PLResponseApi) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - P&L data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),

    /**
     * Get profit breakdown by country for map visualization
     * Returns profit and orders per country
     */
    getProfitByCountry: builder.query<CountryProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/map',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          accountId: filters.accountId,
          amazonAccountId: filters.amazonAccountId,
        },
      }),
      providesTags: ['Profit'],
      // Cache for 300 seconds - map data is historical
      keepUnusedDataFor: 300,
    }),

    /**
     * Get simplified profit trends for Trends screen
     * Returns profit and revenue arrays for easy chart consumption
     */
    getProfitTrendsSimple: builder.query<
      ProfitTrendsSimpleResponse,
      ProfitFilters & { interval?: 'daily' | 'weekly' | 'monthly' }
    >({
      query: (filters) => ({
        url: '/profit/trends/simple',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          interval: filters.interval || 'daily',
          accountId: filters.accountId,
          amazonAccountId: filters.amazonAccountId,
        },
      }),
      providesTags: ['Profit'],
      // Cache for 300 seconds - trend data is historical
      keepUnusedDataFor: 300,
    }),

    /**
     * Get product-level trends for Trends screen
     * Returns daily metric values for each product
     */
    getProductTrends: builder.query<
      ProductTrendsResponse,
      ProfitFilters & { metric?: string }
    >({
      query: (filters) => ({
        url: '/profit/trends/products',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          metric: filters.metric || 'sales',
          accountId: filters.accountId,
          marketplaceId: filters.marketplaceId,
        },
      }),
      providesTags: ['Profit'],
      // Cache for 300 seconds - product trends are historical
      keepUnusedDataFor: 300,
    }),

    /**
     * Get profit summary for multiple periods in one request
     * Optimized endpoint to reduce API calls
     * Returns object with period keys (today, yesterday, 7days, 14days, 30days)
     */
    getProfitSummaryMultiplePeriods: builder.query<
      Record<string, ProfitSummary>,
      Omit<ProfitFilters, 'startDate' | 'endDate'> & { periods?: string }
    >({
      query: (filters) => ({
        url: '/profit/summary/multiple-periods',
        params: {
          accountId: filters.accountId,
          amazonAccountId: filters.amazonAccountId,
          marketplaceId: filters.marketplaceId,
          periods: filters.periods || 'today,yesterday,7days,14days,30days',
        },
      }),
      transformResponse: (response: { success: boolean; data: Record<string, ProfitSummary> }) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - summary data changes less frequently
      keepUnusedDataFor: 120,
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useGetProfitSummaryQuery,
  useGetProfitByProductQuery,
  useGetProfitByMarketplaceQuery,
  useGetProfitTrendsQuery,
  useGetProfitByOrderItemsQuery,
  useGetPLByPeriodsQuery,
  useGetProfitByCountryQuery,
  useGetProfitTrendsSimpleQuery,
  useGetProductTrendsQuery,
  // Lazy queries for manual fetching
  useLazyGetProfitSummaryQuery,
  useLazyGetProfitByProductQuery,
  useLazyGetProfitByMarketplaceQuery,
  useLazyGetProfitTrendsQuery,
  useLazyGetProfitByOrderItemsQuery,
  useLazyGetPLByPeriodsQuery,
  useLazyGetProfitByCountryQuery,
  useLazyGetProfitTrendsSimpleQuery,
  useLazyGetProductTrendsQuery,
  useGetProfitSummaryMultiplePeriodsQuery,
  useLazyGetProfitSummaryMultiplePeriodsQuery,
} = profitApi
