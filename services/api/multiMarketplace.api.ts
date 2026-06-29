import { baseApi } from './baseApi'

export interface Marketplace {
  id: string
  name: string
  code: string
  region?: string | null
  baseCurrency?: string | null
  currency?: string | null
  timezone?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserMarketplace {
  id: string
  userId: string
  marketplaceId: string
  amazonAccountId?: string | null
  credentials?: Record<string, string> | null
  linkedAt: string
  status: 'active' | 'inactive'
  marketplace?: Marketplace
}

export interface LinkMarketplaceRequest {
  marketplaceId: string
  amazonAccountId?: string
  credentials?: Record<string, string>
  status?: 'active' | 'inactive'
}

export interface UpdateMarketplaceRequest {
  amazonAccountId?: string | null
  credentials?: Record<string, string> | null
  status?: 'active' | 'inactive'
}

export const multiMarketplaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportedMarketplaces: builder.query<{ data: Marketplace[] }, void>({
      query: () => '/marketplaces',
      providesTags: ['Marketplaces'],
    }),
    getUserMarketplaces: builder.query<{ data: UserMarketplace[] }, string>({
      query: (userId) => `/users/${userId}/marketplaces`,
      providesTags: ['UserMarketplaces'],
    }),
    linkUserMarketplace: builder.mutation<{ data: UserMarketplace }, { userId: string; data: LinkMarketplaceRequest }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/marketplaces`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserMarketplaces'],
    }),
    updateUserMarketplace: builder.mutation<
      { data: UserMarketplace },
      { userId: string; id: string; data: UpdateMarketplaceRequest }
    >({
      query: ({ userId, id, data }) => ({
        url: `/users/${userId}/marketplaces/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['UserMarketplaces'],
    }),
    unlinkUserMarketplace: builder.mutation<{ success: boolean }, { userId: string; id: string }>({
      query: ({ userId, id }) => ({
        url: `/users/${userId}/marketplaces/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['UserMarketplaces'],
    }),
  }),
})

export const {
  useGetSupportedMarketplacesQuery,
  useGetUserMarketplacesQuery,
  useLinkUserMarketplaceMutation,
  useUpdateUserMarketplaceMutation,
  useUnlinkUserMarketplaceMutation,
} = multiMarketplaceApi

