import { baseApi } from './baseApi'

/**
 * Amazon API endpoints
 * 
 * Provides RTK Query hooks for Amazon SP-API integration testing
 * Includes sandbox endpoints for development and testing
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Sandbox Order
 */
export interface SandboxOrder {
  orderId: string
  orderDate: string
  marketplace: string
  totalAmount: number
  currency?: string
  orderStatus?: string
  [key: string]: any // Allow additional fields from API
}

/**
 * Sandbox Orders Response
 */
export interface SandboxOrdersResponse {
  success: boolean
  data: SandboxOrder[]
  message?: string
  timestamp?: string
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const amazonApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get sandbox orders
     * Returns test/sandbox orders for SP-API integration testing
     * 
     * @param amazonAccountId - AmazonAccount ID from database (optional - if not provided, uses env vars)
     * @param marketplaceId - Marketplace ID (optional)
     * @param createdAfter - ISO date string (optional)
     */
    getSandboxOrders: builder.query<
      SandboxOrdersResponse,
      { amazonAccountId?: string; marketplaceId?: string; createdAfter?: string }
    >({
      query: ({ amazonAccountId, marketplaceId, createdAfter }) => {
        const params = new URLSearchParams()
        if (amazonAccountId) params.append('amazonAccountId', amazonAccountId)
        if (marketplaceId) params.append('marketplaceId', marketplaceId)
        if (createdAfter) params.append('createdAfter', createdAfter)

        const queryString = params.toString()
        return {
          url: `/amazon/sandbox/orders${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        }
      },
      providesTags: ['AmazonAccounts'],
      keepUnusedDataFor: 60, // Cache for 60 seconds
    }),

    /**
     * Test sandbox connection
     * Tests sandbox credentials and token exchange without fetching orders
     * 
     * @param amazonAccountId - AmazonAccount ID from database (optional - if not provided, uses env vars)
     */
    testSandboxConnection: builder.query<
      {
        success: boolean
        message: string
        amazonAccountId?: string
        amazonSellerId?: string
        marketplace?: string
        appName?: string
        appId?: string
        tokenValid: boolean
        timestamp: string
      },
      { amazonAccountId?: string }
    >({
      query: ({ amazonAccountId }) => {
        const params = new URLSearchParams()
        if (amazonAccountId) params.append('amazonAccountId', amazonAccountId)
        
        const queryString = params.toString()
        return {
          url: `/amazon/sandbox/test${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        }
      },
      providesTags: ['AmazonAccounts'],
      keepUnusedDataFor: 30, // Cache for 30 seconds
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useGetSandboxOrdersQuery,
  useLazyGetSandboxOrdersQuery,
  useTestSandboxConnectionQuery,
  useLazyTestSandboxConnectionQuery,
} = amazonApi
