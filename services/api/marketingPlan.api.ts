import { baseApi } from './baseApi'
import type { PricingCountry } from './amazonPricing.api'

/** What one SKU did in the data month (PPC > Marketing Plan). SKUs without an order, an ad cost or stock are not listed. */
export interface MarketingPlanSku {
  sku: string
  units: number
  sales: number
  adSpend: number
  adSales: number
  availableUnits: number
}

export interface MarketingPlanData {
  country: PricingCountry
  /** The data month, `YYYY-MM`. */
  month: string
  currency: string
  rows: MarketingPlanSku[]
}

export const marketingPlanApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMarketingPlan: builder.query<MarketingPlanData, { country: PricingCountry; month: string }>({
      query: (params) => ({ url: '/marketing-plan', params }),
      transformResponse: (response: { success: boolean; data: MarketingPlanData }) => response.data,
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useGetMarketingPlanQuery } = marketingPlanApi
