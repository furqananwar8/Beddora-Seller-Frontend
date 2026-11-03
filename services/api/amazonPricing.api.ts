import { baseApi } from './baseApi'

export type PricingCountry = 'CA' | 'US' | 'MX'

/** One Amazon listing with what its price depends on (the Breakeven Analysis > Amazon tab). */
export interface AmazonPricingRow {
  sku: string
  parentSku: string | null
  asin: string | null
  title: string
  fulfillment: 'FBA' | 'FBM'
  status: string
  productType: string | null
  /** The price the listing sells at now, from Amazon. */
  currentPrice: number | null
  dimensions: { longest: number; median: number; shortest: number; unit: string } | null
  weight: { value: number; unit: string } | null
  /** Amazon's fulfilment fee per unit. */
  fbaFee: number | null
  /** Amazon's referral fee as a share of the price, 0 to 1. */
  referralRate: number | null
  landedCost: number | null
  previousLandedCost: number | null
}

export interface AmazonStorageRates {
  standard: { offPeak: number | null; onPeak: number | null }
  oversize: { offPeak: number | null; onPeak: number | null }
  /** `amazon` when read from months Amazon billed, `default` when any is the published rate. */
  source: 'amazon' | 'default'
}

export interface AmazonPricingData {
  country: PricingCountry
  currency: string
  rows: AmazonPricingRow[]
  storageRates: AmazonStorageRates
  /** When Amazon's fee preview was last read; null before the first sync. */
  feesSyncedAt: string | null
}

export const amazonPricingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAmazonPricing: builder.query<AmazonPricingData, PricingCountry>({
      query: (country) => ({ url: '/products/amazon-pricing', params: { country } }),
      transformResponse: (response: { success: boolean; data: AmazonPricingData }) => response.data,
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useGetAmazonPricingQuery } = amazonPricingApi
