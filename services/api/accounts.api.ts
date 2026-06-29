import { baseApi } from './baseApi'

/**
 * Accounts API endpoints
 * 
 * Provides RTK Query hooks for account management
 * Supports both internal accounts and Amazon Seller Central accounts
 */

// ============================================
// TYPE DEFINITIONS
// ============================================7

/**
 * Internal Account (Account model)
 */
export interface Account {
  id: string
  name: string
  sellerId: string | null
  region: string | null
  isDefault: boolean
  isActive: boolean
  marketplaces: Array<{
    id: string
    name: string
    code: string
    region: string | null
  }>
  createdAt: string
}

/**
 * Amazon Account (AmazonAccount model)
 * Note: Credentials are never included in responses
 */
export interface AmazonAccount {
  id: string
  userId: string
  marketplace: string
  amazonSellerId?: string
  sellerId: string
  marketplaceIds?: string[]
  region?: string
  isActive: boolean
  lastTokenRefreshAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Request types
 */
export interface CreateAccountRequest {
  name: string
  sellerId?: string
  region?: string
  marketplaceIds?: string[]
}

export interface SwitchAccountRequest {
  accountId: string
}

export interface LinkAmazonAccountRequest {
  marketplace: string
  sellerId: string
  accessKey: string
  secretKey: string
  refreshToken: string
}

export interface UpdateAmazonAccountRequest {
  sellerId?: string
  accessKey?: string
  secretKey?: string
  refreshToken?: string
  isActive?: boolean
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const accountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================
    // INTERNAL ACCOUNT ENDPOINTS
    // ============================================

    /**
     * GET /accounts
     * List all accounts for the logged-in user
     */
    getAccounts: builder.query<Account[], void>({
      query: () => '/accounts',
      providesTags: ['Accounts'],
    }),

    /**
     * POST /accounts
     * Create a new account
     */
    createAccount: builder.mutation<Account, CreateAccountRequest>({
      query: (data) => ({
        url: '/accounts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Accounts'],
    }),

    /**
     * POST /accounts/switch
     * Switch active account
     */
    switchAccount: builder.mutation<{ accountId: string; message: string }, SwitchAccountRequest>({
      query: (data) => ({
        url: '/accounts/switch',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Accounts', 'Auth'],
    }),

    /**
     * GET /accounts/:id/marketplaces
     * Get marketplaces for a specific account
     */
    getAccountMarketplaces: builder.query<Account['marketplaces'], string>({
      query: (accountId) => `/accounts/${accountId}/marketplaces`,
      providesTags: (result, error, accountId) => [{ type: 'Accounts', id: accountId }],
    }),

    // ============================================
    // AMAZON ACCOUNT ENDPOINTS
    // ============================================

    /**
     * GET /accounts/linked
     * List all linked Amazon accounts for the logged-in user
     */
    getAmazonAccounts: builder.query<AmazonAccount[], void>({
      query: () => '/accounts/linked',
      providesTags: ['AmazonAccounts'],
    }),

    /**
     * POST /accounts/link
     * Link a new Amazon Seller Central account
     */
    linkAmazonAccount: builder.mutation<AmazonAccount, LinkAmazonAccountRequest>({
      query: (data) => ({
        url: '/accounts/link',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * PATCH /accounts/:id
     * Update Amazon account credentials
     */
    updateAmazonAccount: builder.mutation<AmazonAccount, { id: string; data: UpdateAmazonAccountRequest }>({
      query: ({ id, data }) => ({
        url: `/accounts/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * DELETE /accounts/:id
     * Remove (unlink) an Amazon account
     */
    deleteAmazonAccount: builder.mutation<void, string>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    /**
     * POST /accounts/switch/:id
     * Set the current active Amazon account in session
     */
    switchAmazonAccount: builder.mutation<AmazonAccount, string>({
      query: (id) => ({
        url: `/accounts/switch/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['AmazonAccounts'],
    }),

    // ============================================
    // OAUTH ENDPOINTS
    // ============================================

    /**
     * GET /amazon/oauth/authorize
     * Generate OAuth authorization URL
     */
    generateOAuthUrl: builder.query<
      { authorizationUrl: string; state: string },
      { redirectUri: string; marketplace?: string; clientId?: string }
    >({
      query: ({ redirectUri, marketplace, clientId }) => {
        const params = new URLSearchParams({ redirectUri })
        if (marketplace) params.append('marketplace', marketplace)
        if (clientId) params.append('clientId', clientId)
        return `/amazon/oauth/authorize?${params.toString()}`
      },
      transformResponse: (response: { success: boolean; data: { authorizationUrl: string; state: string } }) => response.data,
    }),

    /**
     * GET /amazon/oauth/status
     * Get OAuth configuration status
     */
    getOAuthStatus: builder.query<
      {
        oauthEnabled: boolean
        hasClientId: boolean
        hasClientSecret: boolean
        clientIdPrefix: string | null
      },
      void
    >({
      query: () => '/amazon/oauth/status',
      transformResponse: (response: { success: boolean; data: { oauthEnabled: boolean; hasClientId: boolean; hasClientSecret: boolean; clientIdPrefix: string | null } }) => response.data,
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

// Internal account hooks
export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useSwitchAccountMutation,
  useGetAccountMarketplacesQuery,
} = accountsApi

// Amazon account hooks
export const {
  useGetAmazonAccountsQuery,
  useLinkAmazonAccountMutation,
  useUpdateAmazonAccountMutation,
  useDeleteAmazonAccountMutation,
  useSwitchAmazonAccountMutation,
  useGenerateOAuthUrlQuery,
  useGetOAuthStatusQuery,
} = accountsApi

// ============================================
// LEGACY HOOKS (for backward compatibility)
// ============================================

/**
 * @deprecated Use useGetAmazonAccountsQuery instead
 */
export const useGetLinkedAccountsQuery = useGetAmazonAccountsQuery

/**
 * @deprecated Use useDeleteAmazonAccountMutation instead
 */
export const useDeleteLinkedAccountMutation = useDeleteAmazonAccountMutation
