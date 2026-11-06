import { createApi, fetchBaseQuery, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import { clearCredentials } from '@/store/auth.slice'

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
  'Products',
  'AmazonAccounts',
  'Campaigns',
  'ScheduledJobs',
  'Permissions',
  'Profit',
  'Barcode',
  'Inventory',
  'InventoryAdjustments',
  'SellerCentralShipments',
  'SellerCentralSync',
  'InventoryForecast',
  'InventoryKpis',
  'PurchaseOrders',
  'InboundShipments',
  'ShipFromAddresses',
  'ProductManagers',
  'PPC',
  'PPCMetrics',
  'PPCOptimization',
  'PPCBulk',
  'PPCProfit',
  'CampaignPerformance',
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
  'Invites',
  'ManagedUsers',
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
  'ReportSyncManagement',
  'FinancePartners',
  'FinanceBankProfiles',
  'FinanceCostCenters',
  'FinanceRequests',
  'FinanceProcess',
  'FinanceApprovers',
  'FinanceExpenseTypes',
  'ProcurementProducts',
  'ProcurementCategories',
  'ProcurementPurchaseOrders',
  'ProcurementPurchaseInvoices',
  'ProcurementPackagingLists',
  'ProcurementContainers',
  'InboundReceiving',
  'ProcurementPriceAnalysis',
  'Notifications',
  'SkuMapping',
  'CompanyDetails',
  'Warehouses',
  'ShippingConfig',
  'ShippingShipments',
  'ShippingChannelOrders'
] as const

export type TagType = typeof tagTypes[number]

// Base API URL - update this with your actual API endpoint
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Authentication is the HttpOnly session cookie, so there is no token to attach.
// Content-Type is left to RTK Query (FormData sets its own boundary).
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
})

/** Endpoints where a 401 means "wrong credentials", not "session expired". */
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/me']

const isCredentialRequest = (args: string | FetchArgs): boolean => {
  const url = typeof args === 'string' ? args : args.url
  return CREDENTIAL_ENDPOINTS.some((endpoint) => url.startsWith(endpoint))
}

/** An expired or revoked session answers 401: drop the local user so RouteGuard sends them to login. */
const baseQueryWithSessionExpiry: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error?.status === 401 && !isCredentialRequest(args)) {
    api.dispatch(clearCredentials())
  }
  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithSessionExpiry,
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

