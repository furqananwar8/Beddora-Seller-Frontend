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
    currency?: string

    totalRevenue: number
    totalExpense: number
    totalProfit: number
    totalOrders: number
    totalUnits: number
    totalRefunds: number
    totalRefundsCount?: number
    totalFees: number
    totalCOGS: number
    totalExpenses: number

    refundCost?: number
    refundDetails?: {
      refundedAmount: number
      refundCommission: number
      promotion: number
      valueOfReturnedItems: number
      refundedReferralFee: number
    }

    advertisingCost?: number
    advertisingDetails?: {
      sponsoredProducts: number
      sponsoredBrandsVideo: number
      sponsoredDisplay: number
      sponsoredBrands: number
    }

    totalPromo?: number

    amazonFeeDetails?: {
      fbaStorageFee: number
      fbaPerUnitFulfillmentFee: number
      referralFee: number
      dealParticipationFee: number
      dealPerformanceFee: number
      fbaDisposalFee: number
      salesTaxCollectionFee: number
      reversalReimbursement: number
      other: number
    }
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
  asin: string | null
  imageUrl: string | null

  // Sales
  unitsSold: number
  salesRevenue: number

  // Refunds
  totalRefunds: number
  refundAmount: number
  refundCost: number

  // Promo
  promoRebates: number

  // Ads
  advertisingCost: number

  // Amazon fees
  totalFees: number
  fbaFees: number
  fbaFulfillmentFee: number
  salesTaxServiceFees: number
  reversalReimbursements: number
  sellingFees: number
  otherAmazonAdjustments: number

  // COGS
  cogsRate: number
  totalCOGS: number

  // Profit
  totalExpenses: number
  grossProfit: number
  netProfit: number

  // Performance
  realACOS: number
  roi: number
  margin: number
  netMargin: number

  avgProfitPerUnit: number
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

interface ProfitSummaryMultiplePeriodsArgs {
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
}

export interface CountryProfitBreakdown {
  country: string
  region: string

  profit: number
  orders: number
  stock: number
  unitsSold: number
  sales: number

  totalFees: number
  totalPromo: number
  totalCOGS: number
  totalExpenses: number

  // Backward-compatible fields
  amazonFees?: number
  promoRebates?: number
  costOfGoods?: number
  indirectExpenses?: number

  grossProfit: number
  estimatedPayout: number
  netProfit: number

  margin: number
  roi: number
  realACOS: number

  sellingFees: number
  fbaFees: number
  otherAmazonAdj: number

  cogsBuyingPrice: number
  cogsShippingPrice: number
  cogsImportPrice: number

  advertisingCost: number

  advertisingDetails: {
    sponsoredProducts: number
    sponsoredBrandsVideo: number
    sponsoredDisplay: number
    sponsoredBrands: number
  }

  totalRefunds: number
  totalRefundsCount: number
  refundedUnits: number
  refundPercentage: number
  refundCost: number

  refundDetails: {
    refundedAmount: number
    refundCommission: number
    promotion: number
    valueOfReturnedItems: number
    refundedReferralFee: number
  }

  amazonFeeDetails: {
    fbaStorageFee: number
    fbaPerUnitFulfillmentFee: number
    referralFee: number
    dealParticipationFee: number
    dealPerformanceFee: number
    fbaDisposalFee: number
    salesTaxCollectionFee: number
    reversalReimbursement: number
    other: number
  }

  sellableReturns: number
  totalReturns: number
  sellableReturnsPercent: number
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

// ============================================
// PROFIT FILTERS
// ============================================

export interface ProfitFilters {
  accountId?: string
  amazonAccountId?: string

  marketplaceId?: string
  marketplace?: string
  marketplaces?: string[]

  sku?: string

  startDate?: string
  endDate?: string

  period?:
    | 'day'
    | 'week'
    | 'month'

  preset?:
    | 'last-12-months'
    | 'last-3-months'
    | 'last-30-days'
    | 'custom'

  periodicity?:
    | 'day'
    | 'week'
    | 'month'

  currency?: string

  interval?:
    | 'daily'
    | 'weekly'
    | 'monthly'

  metric?: string

  page?: number
  limit?: number
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const profitApi = baseApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    // ============================================================
    // PROFIT SUMMARY
    // ============================================================

    getProfitSummary: builder.query<
      ProfitSummary,
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/summary',
        params: {
          period: filters.period,
          preset: filters.preset,

          // IMPORTANT:
          // Custom date range is sent directly to backend.
          startDate: filters.startDate,
          endDate: filters.endDate,

          accountId: filters.accountId,
          amazonAccountId: filters.amazonAccountId,

          marketplaceId: filters.marketplaceId,
          marketplace: filters.marketplace,
          marketplaces: filters.marketplaces,

          sku: filters.sku,
          currency: filters.currency,
        },
      }),

      transformResponse: (
  response: any
): ProfitSummary => {
  return response as ProfitSummary
},

      providesTags: ['Profit'],
      keepUnusedDataFor: 120,
    }),

    // ============================================================
    // PROFIT BY PRODUCT
    // ============================================================

    getProfitByProduct: builder.query<
      ProductProfitBreakdown[],
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/by-product',
        params: filters,
      }),

      transformResponse: (
        response: ProductBreakdownResponse
      ) => response.data,

      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),

    // ============================================================
    // PROFIT BY MARKETPLACE
    // ============================================================

    getProfitByMarketplace: builder.query<
      MarketplaceProfitBreakdown[],
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/by-marketplace',
        params: filters,
      }),

      transformResponse: (
        response: MarketplaceBreakdownResponse
      ) => response.data,

      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),

    // ============================================================
    // PROFIT TRENDS
    // ============================================================

    getProfitTrends: builder.query<
      ProfitTrendsResponse,
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/trends',
        params: filters,
      }),

      transformResponse: (
        response: ProfitTrendsApiResponse
      ) => response.data,

      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    // ============================================================
    // PROFIT BY ORDER ITEMS
    // ============================================================

    getProfitByOrderItems: builder.query<
      OrderItemProfitBreakdown[],
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/by-order-items',
        params: filters,
      }),

      transformResponse: (
        response: OrderItemsBreakdownResponse
      ) => response.data,

      providesTags: ['Profit'],
      keepUnusedDataFor: 120,
    }),

    // ============================================================
    // P&L
    // ============================================================

    getPLByPeriods: builder.query<
      PLResponse,
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/pl',
        params: filters,
      }),

      transformResponse: (
        response: PLResponseApi
      ) => response.data,

      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    // ============================================================
    // PROFIT BY COUNTRY
    // ============================================================

    getProfitByCountry: builder.query<
      CountryProfitBreakdown[],
      ProfitFilters
    >({
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

      transformResponse: (
        response: {
          success?: boolean
          data?: CountryProfitBreakdown[]
        }
      ) => response.data ?? [],

      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    // ============================================================
    // SIMPLE PROFIT TRENDS
    // ============================================================

    getProfitTrendsSimple: builder.query<
      ProfitTrendsSimpleResponse,
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/trends/simple',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,

          interval:
            filters.interval || 'daily',

          accountId: filters.accountId,
          amazonAccountId:
            filters.amazonAccountId,

          marketplaceId:
            filters.marketplaceId,

          marketplaces:
            filters.marketplaces,

          currency:
            filters.currency,
        },
      }),

      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    // ============================================================
    // PRODUCT TRENDS
    // ============================================================

    getProductTrends: builder.query<
      ProductTrendsResponse,
      ProfitFilters
    >({
      query: (filters) => ({
        url: '/profit/trends/products',
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,

          metric:
            filters.metric || 'sales',

          periodicity:
            filters.periodicity || 'day',

          accountId:
            filters.accountId,

          amazonAccountId:
            filters.amazonAccountId,

          marketplaceId:
            filters.marketplaceId,

          marketplaces:
            filters.marketplaces,

          currency:
            filters.currency,

          page:
            filters.page,

          limit:
            filters.limit,
        },
      }),

      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),

    // ============================================================
    // MARKETPLACES
    // ============================================================

    getMarketplaces: builder.query<
      Marketplace[],
      { accountId?: string }
    >({
      query: ({ accountId }) => ({
        url: '/marketplaces',
        params: {
          accountId,
        },
      }),

      transformResponse: (
        response: MarketplacesResponse
      ) => response.data,

      providesTags: ['Marketplaces'],
      keepUnusedDataFor: 3600,
    }),

    // ============================================================
    // MULTIPLE PERIOD PRODUCT TRENDS
    // ============================================================

    getProfitSummaryMultiplePeriods:
      builder.query<any, ProfitSummaryMultiplePeriodsArgs>({
        query: () => ({
          url: '/profit/trends/products-multiple-period',
        }),

        providesTags: ['Profit'],
        keepUnusedDataFor: 300,
      }),
  }),
})

// ============================================
// HOOKS
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
  useGetProfitSummaryMultiplePeriodsQuery,
} = profitApi