import { baseApi } from './baseApi'

export type ChartPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'
export type ChartMetric = 'profit' | 'sales' | 'ppc' | 'returns'

export interface ChartFilters {
  accountId?: string
  amazonAccountId?: string
  marketplaceId?: string
  sku?: string
  campaignId?: string
  startDate?: string
  endDate?: string
  period?: ChartPeriod
}

export interface ChartSeriesPoint {
  period: string
  value: number
}

export interface ChartSeries {
  label: string
  data: ChartSeriesPoint[]
}

export interface ChartResponse {
  metric: ChartMetric
  period: ChartPeriod
  startDate: string
  endDate: string
  series: ChartSeries[]
}

export interface ComparisonResponse {
  metric: ChartMetric
  period: ChartPeriod
  current: ChartSeries
  previous: ChartSeries
  currentRange: { startDate: string; endDate: string }
  previousRange: { startDate: string; endDate: string }
}

export interface ChartApiResponse {
  success: boolean
  data: ChartResponse
}

export interface ComparisonApiResponse {
  success: boolean
  data: ComparisonResponse
}

export interface DashboardChartData {
  period: string
  unitsSold: number
  advertisingCost: number
  refunds: number
  netProfit: number
}

export interface DashboardChartResponse {
  period: ChartPeriod
  startDate: string
  endDate: string
  data: DashboardChartData[]
}

export interface DashboardChartApiResponse {
  success: boolean
  data: DashboardChartResponse
}

export const chartsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfitTrend: builder.query<ChartResponse, ChartFilters>({
      query: (filters) => ({
        url: '/profit/charts/profit',
        params: filters,
      }),
      transformResponse: (response: ChartApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - chart data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),
    getSalesTrend: builder.query<ChartResponse, ChartFilters>({
      query: (filters) => ({
        url: '/profit/charts/sales',
        params: filters,
      }),
      transformResponse: (response: ChartApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - chart data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),
    getPpcTrend: builder.query<ChartResponse, ChartFilters>({
      query: (filters) => ({
        url: '/profit/charts/ppc',
        params: filters,
      }),
      transformResponse: (response: ChartApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - chart data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),
    getReturnsTrend: builder.query<ChartResponse, ChartFilters>({
      query: (filters) => ({
        url: '/profit/charts/returns',
        params: filters,
      }),
      transformResponse: (response: ChartApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - chart data is historical and changes less frequently
      keepUnusedDataFor: 300,
    }),
    getComparison: builder.query<ComparisonResponse, ChartFilters & { metric?: ChartMetric }>({
      query: (filters) => ({
        url: '/profit/charts/comparison',
        params: filters,
      }),
      transformResponse: (response: ComparisonApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - comparison data is historical
      keepUnusedDataFor: 300,
    }),
    getDashboardChart: builder.query<DashboardChartResponse, ChartFilters>({
      query: (filters) => ({
        url: '/profit/charts/dashboard',
        params: filters,
      }),
      transformResponse: (response: DashboardChartApiResponse) => response.data,
      providesTags: ['Profit'],
      // Cache for 300 seconds - dashboard chart data is historical
      keepUnusedDataFor: 300,
    }),
  }),
})

export const {
  useGetProfitTrendQuery,
  useGetSalesTrendQuery,
  useGetPpcTrendQuery,
  useGetReturnsTrendQuery,
  useGetComparisonQuery,
  useGetDashboardChartQuery,
} = chartsApi

