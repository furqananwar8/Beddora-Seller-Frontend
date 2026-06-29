import { baseApi } from './baseApi'

/**
 * KPIs API endpoints
 * 
 * Provides RTK Query hooks for Key Performance Indicator calculations
 * Supports real-time KPI dashboard with filtering and breakdowns
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * KPI filter parameters
 */
export interface KPIFilters {
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
  sku?: string
  campaignId?: string
  adGroupId?: string
  keywordId?: string
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month' | 'hour' | 'custom'
}

/**
 * Units sold KPI response
 */
export interface UnitsSoldKPI {
  totalUnits: number
  breakdown: Array<{
    sku?: string
    productId?: string
    productTitle?: string
    marketplaceId?: string
    marketplaceName?: string
    period: string
    units: number
    orderCount: number
  }>
  period: {
    startDate: string | null
    endDate: string | null
  }
}

/**
 * Returns cost KPI response
 */
export interface ReturnsCostKPI {
  totalReturnsCost: number
  totalReturnsCount: number
  breakdown: Array<{
    reasonCode: string | null
    reason: string | null
    sku?: string
    productId?: string
    productTitle?: string
    marketplaceId?: string
    marketplaceName?: string
    amount: number
    count: number
  }>
  period: {
    startDate: string | null
    endDate: string | null
  }
}

/**
 * Advertising cost (PPC) KPI response
 */
export interface AdvertisingCostKPI {
  totalSpend: number
  totalSales: number
  averageACOS: number
  breakdown: Array<{
    campaignId: string
    campaignName?: string
    adGroupId?: string
    adGroupName?: string
    keywordId?: string
    keywordText?: string
    spend: number
    sales: number
    clicks: number
    impressions: number
    acos: number | null
    roas: number | null
  }>
  period: {
    startDate: string | null
    endDate: string | null
  }
}

/**
 * FBA fees KPI response
 */
export interface FBAFeesKPI {
  totalFBAFees: number
  breakdown: Array<{
    period: string
    feeType: string
    amount: number
    orderCount: number
  }>
  period: {
    startDate: string | null
    endDate: string | null
    granularity: 'hour' | 'day' | 'week' | 'month'
  }
}

/**
 * Payout estimate KPI response
 */
export interface PayoutEstimateKPI {
  estimatedPayout: number
  grossRevenue: number
  totalDeductions: number
  breakdown: {
    fees: number
    refunds: number
    returns: number
    advertising: number
    fbaFees: number
    other: number
  }
  period: {
    startDate: string | null
    endDate: string | null
  }
}

/**
 * API Response wrappers
 */
export interface UnitsSoldKPIResponse {
  success: boolean
  data: UnitsSoldKPI
}

export interface ReturnsCostKPIResponse {
  success: boolean
  data: ReturnsCostKPI
}

export interface AdvertisingCostKPIResponse {
  success: boolean
  data: AdvertisingCostKPI
}

export interface FBAFeesKPIResponse {
  success: boolean
  data: FBAFeesKPI
}

export interface PayoutEstimateKPIResponse {
  success: boolean
  data: PayoutEstimateKPI
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const kpisApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get units sold KPI
     * Returns aggregated units sold by product, marketplace, and period
     */
    getUnitsSoldKPI: builder.query<UnitsSoldKPI, KPIFilters>({
      query: (filters) => ({
        url: '/profit/kpis/units-sold',
        params: filters,
      }),
      transformResponse: (response: UnitsSoldKPIResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - KPI data changes but benefits from caching
      keepUnusedDataFor: 120,
    }),

    /**
     * Get returns cost KPI
     * Returns returns cost breakdown by reason code, SKU, and marketplace
     */
    getReturnsCostKPI: builder.query<ReturnsCostKPI, KPIFilters>({
      query: (filters) => ({
        url: '/profit/kpis/returns-cost',
        params: filters,
      }),
      transformResponse: (response: ReturnsCostKPIResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - returns data changes but benefits from caching
      keepUnusedDataFor: 120,
    }),

    /**
     * Get advertising cost (PPC) KPI
     * Returns PPC spend by campaign, ad group, and keyword
     */
    getAdvertisingCostKPI: builder.query<AdvertisingCostKPI, KPIFilters>({
      query: (filters) => ({
        url: '/profit/kpis/advertising-cost',
        params: filters,
      }),
      transformResponse: (response: AdvertisingCostKPIResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - PPC data can change but benefits from caching
      keepUnusedDataFor: 120,
    }),

    /**
     * Get FBA fees KPI
     * Returns aggregated FBA fees by period and fee type
     */
    getFBAFeesKPI: builder.query<FBAFeesKPI, KPIFilters>({
      query: (filters) => ({
        url: '/profit/kpis/fba-fees',
        params: filters,
      }),
      transformResponse: (response: FBAFeesKPIResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 180 seconds - FBA fees data is relatively stable
      keepUnusedDataFor: 180,
    }),

    /**
     * Get payout estimate KPI
     * Returns estimated payouts after deductions, fees, and refunds
     */
    getPayoutEstimateKPI: builder.query<PayoutEstimateKPI, KPIFilters>({
      query: (filters) => ({
        url: '/profit/kpis/payout-estimate',
        params: filters,
      }),
      transformResponse: (response: PayoutEstimateKPIResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 120 seconds - payout estimates can change but benefit from caching
      keepUnusedDataFor: 120,
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useGetUnitsSoldKPIQuery,
  useGetReturnsCostKPIQuery,
  useGetAdvertisingCostKPIQuery,
  useGetFBAFeesKPIQuery,
  useGetPayoutEstimateKPIQuery,
  // Lazy queries for manual fetching
  useLazyGetUnitsSoldKPIQuery,
  useLazyGetReturnsCostKPIQuery,
  useLazyGetAdvertisingCostKPIQuery,
  useLazyGetFBAFeesKPIQuery,
  useLazyGetPayoutEstimateKPIQuery,
} = kpisApi

