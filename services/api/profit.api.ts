import { baseApi } from './baseApi'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type PeriodSummaryPeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | '7DAYSAGO'
  | '14DAYSAGO'
  | '30DAYSAGO'
  | 'MONTH_TO_DATE'
  | 'THIS_MONTH_FORECAST'
  | 'LAST_MONTH'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | '2WEEKSAGO'
  | '3WEEKSAGO'
  | '2MONTHSAGO'
  | '3MONTHSAGO'
  | '2DAYSAGO'
  | '3DAYSAGO'
  | '7DAYS'
  | '14DAYS'
  | '30DAYS'
  | '8DAYSAGO'

export interface PeriodSummary {
  period: PeriodSummaryPeriod
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
    totalExpense: number
    totalProfit: number
    totalOrders: number
    totalUnits: number
    totalRefunds: number
    totalFees: number
    totalCOGS: number
    totalExpenses: number
  }
  totalExpenses: number
  totalCOGS: number
  totalFees: number
  salesRevenue: number
  netMargin: number
  netProfit: number
  periods: PeriodSummary[]
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
  country: string
  region: string
  profit: number
  orders: number
  stock: number
  unitsSold: number
  sales: number
  amazonFees: number
  sellableReturnsPercent: number
  costOfGoods: number
  refundCost: number
  grossProfit: number
}

export interface Marketplace {
  id: string
  name: string
  code: string
  country: string
  isDefault?: boolean
}

export interface MarketplacesResponse {
  success: boolean
  data: Marketplace[]
}

export interface ProfitFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string      // single (backward compat)
  marketplaces?: string[]       // multi-select array
  sku?: string
  period?: 'day' | 'week' | 'month'
  preset?: string
  currency?: string
}

export interface ProductProfitBreakdown {
  sku: string
  productId: string | null
  productTitle: string | null
  asin: string | null
  imageUrl: string | null
  unitsSold: number
  totalCOGS: number
  totalCOGSQty: number
  cogsPerUnit: number
  salesVelocity: number
}

export interface ProductBreakdownResponse {
  success: boolean
  data: ProductProfitBreakdown[]
  totalRecords: number
  totalPages: number
  page: number
  limit: number
}

export interface ProfitFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
  marketplaces?: string[]
  sku?: string
  period?: 'day' | 'week' | 'month'
  preset?: string
  currency?: string
  page?: number
  limit?: number
  cogsSet?: 'all' | 'set' | 'notSet'
  search?: string
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const profitApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getProfitSummary: builder.query<any, any>({
      query: (filters) => ({
        url: '/profit/summary',
        params: filters,
      }),
      transformResponse: (response: any): any => {
        console.log('API response shape:', Object.keys(response))
        return {
          summary: response.summary,
          periods: response.periods,
        }
      },
      providesTags: ['Profit'],
      keepUnusedDataFor: 120,
    }),

    getProfitByProduct: builder.query<ProductBreakdownResponse, ProfitFilters>({
      query: (filters) => ({
        url: '/profit/by-product',
        params: filters,
      }),
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
          marketplaceId: filters.marketplaceId,
          marketplaces: filters.marketplaces,
          currency: filters.currency,
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
          marketplaceId: filters.marketplaceId,
          marketplaces: filters.marketplaces,
          currency: filters.currency,
        },
      }),
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    getProductTrends: builder.query<
      ProductTrendsResponse,
      ProfitFilters & { metric?: string; periodicity?: string; page?: number; limit?: number }
    >({
      query: (filters) => ({
        url: '/profit/trends/products',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          metric: filters.metric || 'sales',
          periodicity: filters.periodicity || 'day',
          accountId: filters.accountId,
          marketplaceId: filters.marketplaceId,
          marketplaces: filters.marketplaces,
          currency: filters.currency,
          page: filters.page,
          limit: filters.limit,
        },
      }),
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    getMarketplaces: builder.query<Marketplace[], { accountId?: string }>({
      query: ({ accountId }) => ({
        url: '/marketplaces',
        params: { accountId },
      }),
      transformResponse: (response: MarketplacesResponse) => response.data,
      providesTags: ['Marketplaces'],
      keepUnusedDataFor: 3600,
    }),

    getProfitSummaryMultiplePeriods: builder.query<any, any>({
       query: (filters) => ({
        url: '/profit/trends/products-multiple-period'
      }),
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    })
    
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
  useGetMarketplacesQuery,
  useLazyGetProfitSummaryQuery,
  useLazyGetProfitByProductQuery,
  useLazyGetProfitByMarketplaceQuery,
  useLazyGetProfitTrendsQuery,
  useLazyGetProfitByOrderItemsQuery,
  useLazyGetPLByPeriodsQuery,
  useLazyGetProfitByCountryQuery,
  useLazyGetProfitTrendsSimpleQuery,
  useLazyGetProductTrendsQuery,
  useLazyGetMarketplacesQuery,
  useGetProfitSummaryMultiplePeriodsQuery
} = profitApi