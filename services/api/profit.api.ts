import { baseApi } from './baseApi'

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface PeriodSummary {
  period: 'TODAY' | 'YESTERDAY' | '7DAYSAGO' | '14DAYSAGO' | '30DAYSAGO'
  salesRevenue: number
  salesCount: number
  ordersUnitCount: number
  totalFees: number
  totalRefunds: number
  totalRefundsCount: number
  totalCOGS: number
  totalExpenses: number
  netProfit: number
  netMargin: number
}

export interface ProfitSummary {
  summary: {
    totalRevenue: number
    totalProfit: number
    totalOrders: number
    totalUnits: number
    totalRefunds: number
    totalFees: number
    totalCOGS: number
    totalExpenses: number
  }
  periods: PeriodSummary[]
}

// Legacy shape for backward compatibility (single period)
export interface LegacyProfitSummary {
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

export interface ProfitTrendsResponse {
  data: ProfitTrendData[]
  period: 'day' | 'week' | 'month'
  startDate: string
  endDate: string
}

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

export interface PLPeriodValue {
  period: string
  value: number
}

export interface PLMetricRow {
  parameter: string
  isExpandable: boolean
  periods: PLPeriodValue[]
  total: number
  children?: PLMetricRow[]
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

export interface ProfitTrendsSimpleResponse {
  labels: string[]
  profit: number[]
  revenue: number[]
}

export interface ProductTrendDateValue {
  date: string
  value: number
  changePercent: number
}

export interface ProductTrendsResponse {
  products: Array<{
    productId: string
    sku: string
    productTitle: string | null
    productImageUrl: string | null
    dailyValues: ProductTrendDateValue[]
    chartData: number[]
  }>
  dates: string[]
  metric: string
}

export interface CountryProfitBreakdown {
  country: string      // ISO code for flag & map matching (e.g. "US", "CA")
  region: string      // Display name: country name OR state/province name
  profit: number      // Gross profit (same as grossProfit for backward compat)
  orders: number
  stock: number
  unitsSold: number
  sales: number       // Positive revenue
  amazonFees: number  // Negative
  sellableReturnsPercent: number
  costOfGoods: number // Negative
  refundCost: number  // Negative
  grossProfit: number
}

export interface ProfitFilters {
  startDate: string
  endDate: string
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
  sku?: string
  period?: 'day' | 'week' | 'month'

}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const profitApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Add this at the top of your profit.api.ts or in the endpoint:
    getProfitSummary: builder.query<ProfitSummary, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/summary',
        params: filters,
      }),
      transformResponse: (response: any): ProfitSummary => {
        console.log('API response shape:', Object.keys(response))
        // API returns { success, summary, periods } — extract what we need
        return {
          summary: response.summary,
          periods: response.periods,
        }
      },
      providesTags: ['Profit'],
      keepUnusedDataFor: 120,
    }),

    getProfitByProduct: builder.query<ProductProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-product',
        params: filters,
      }),
      transformResponse: (response: ProductBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),

    getProfitByMarketplace: builder.query<MarketplaceProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-marketplace',
        params: filters,
      }),
      transformResponse: (response: MarketplaceBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),

    getProfitTrends: builder.query<ProfitTrendsResponse, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/trends',
        params: filters,
      }),
      transformResponse: (response: ProfitTrendsApiResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    getProfitByOrderItems: builder.query<OrderItemProfitBreakdown[], ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-order-items',
        params: filters,
      }),
      transformResponse: (response: OrderItemsBreakdownResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 120,
    }),

    getPLByPeriods: builder.query<PLResponse, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/pl',
        params: filters,
      }),
      transformResponse: (response: PLResponseApi) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

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
      keepUnusedDataFor: 300,
    }),

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
      keepUnusedDataFor: 300,
    }),

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
      keepUnusedDataFor: 300,
    }),
  }),
})

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
  useLazyGetProfitSummaryQuery,
  useLazyGetProfitByProductQuery,
  useLazyGetProfitByMarketplaceQuery,
  useLazyGetProfitTrendsQuery,
  useLazyGetProfitByOrderItemsQuery,
  useLazyGetPLByPeriodsQuery,
  useLazyGetProfitByCountryQuery,
  useLazyGetProfitTrendsSimpleQuery,
  useLazyGetProductTrendsQuery,
} = profitApi