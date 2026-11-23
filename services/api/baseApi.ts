import { createApi, fetchBaseQuery, retry, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
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
  'ProcurementProductImports',
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
  'GstRates',
  'Departments',
  'ApprovalRules',
  'NotificationRules',
  'ShippingConfig',
  'ShippingShipments',
  'ShippingChannelOrders',
  'ShippingDrafts',
  'ShipmentBols',
  'SystemEmail'
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

const isRead = (args: string | FetchArgs) => typeof args === 'string' || !args.method || args.method.toUpperCase() === 'GET'
const isTransient = (error: FetchBaseQueryError) =>
  error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR' || (typeof error.status === 'number' && (error.status >= 500 || error.status === 429 || error.status === 408))

/** A read that fails for a passing reason (network blip, gateway timeout, throttle) is retried with backoff; writes and real errors (4xx) are never repeated. */
const baseQueryWithRetry = retry(
  async (args, api, extraOptions) => {
    const result = await baseQueryWithSessionExpiry(args, api, extraOptions)
    if (result.error && !(isRead(args) && isTransient(result.error))) retry.fail(result.error)
    return result
  },
  { maxRetries: 2 }
) as BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
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

