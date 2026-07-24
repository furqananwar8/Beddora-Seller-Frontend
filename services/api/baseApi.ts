import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '@/store/store'

/**
 * Base API configuration for RTK Query
 * 
 * Enterprise Best Practice:
 * - Centralized API configuration
 * - Type-safe state access
 * - Automatic authentication header injection
 * - Cache tag management for invalidation
 * 
 * This is the central API setup. All API endpoints should extend from this base.
 */

// Define tag types for cache invalidation
export const tagTypes = [
  'Auth',
  'Accounts',
  'AmazonAccounts',
  'Campaigns',
  'ScheduledJobs',
  'Permissions',
  'Profit',
  'Inventory',
  'InventoryForecast',
  'InventoryKpis',
  'PurchaseOrders',
  'InboundShipments',
  'PPC',
  'PPCMetrics',
  'PPCOptimization',
  'PPCBulk',
  'PPCProfit',
  'ListingAlerts',
  'BuyBoxAlerts',
  'FeeChangeAlerts',
  'FeedbackAlerts',
  'EmailTemplates',
  'EmailQueue',
  'EmailStats',
  'SchedulingRules',
  'TrackingStats',
  'RefundDiscrepancies',
  'ReimbursementCases',
  'Marketplaces',
  'UserMarketplaces',
  'Currencies',
  'ExchangeRates',
  'Alerts',
  'Reports',
  'SyncStatus',
  'SyncLogs',
  'QueueStats',
  'FailedJobs',
  'RetryStats',
  'Repricer',
  'ResellerWorkflow',
  'Suppliers',
  'AutoresponderCampaigns',
  'AutoresponderProducts',
  'AutoresponderOrders',
  'MoneyBack',
  'Alerts',
  'EbayProducts',
] as const

export type TagType = typeof tagTypes[number]

// Base API URL - update this with your actual API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // send cookies (for HttpOnly refresh token)
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state (auth slice) with proper typing
      const state = getState() as RootState
      const token = state.auth?.accessToken

      // Add authorization header if token exists
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }

      // Note: Don't set Content-Type here - RTK Query will handle it automatically
      // For FormData, browser will set Content-Type with boundary
      // For JSON, RTK Query will stringify and set Content-Type
      return headers
    },
  }),
  tagTypes,
  // Default cache time: 60 seconds (can be overridden per endpoint)
  // This ensures data is reused across navigations instead of refetching too often
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
})

/**
 * Usage:
 * - Import baseApi in your feature API files
 * - Use baseApi.injectEndpoints() to add endpoints
 * - Example: See auth.api.ts, profit.api.ts, etc.
 */

