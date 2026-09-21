import { baseApi } from './baseApi'

export type CogsSetFilter = 'all' | 'set' | 'notSet'

export interface ProductFilters {
  accountId: string
  amazonAccountId?: string
  marketplaceId?: string
  startDate?: string
  endDate?: string
  cogsSet?: CogsSetFilter
  search?: string
  page?: number
  limit?: number
}

export interface Product {
  sku: string
  productId: number | null
  productTitle: string | null
  asin: string | null
  imageUrl: string | null
  marketplace?: string | null
  fulfillmentChannel?: string | null
  fulfillmentChannelCode?: string | null
  cogsPerUnit: number
  totalCOGS?: number
  totalCOGSQty?: number
  salesVelocity: number
  isLocked?: boolean
  lockedBy?: string | null
}

export interface ProductsResponse {
  success: boolean
  data: Product[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
}

export const productsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAllProducts: builder.query<ProductsResponse, ProductFilters>({
      query: (filters) => ({
        url: '/products',
        params: {
          accountId: filters.accountId,
          amazonAccountId: filters.amazonAccountId,
          marketplaceId: filters.marketplaceId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          cogsSet: filters.cogsSet,
          search: filters.search ? filters.search.trim() : undefined,
          page: filters.page,
          limit: filters.limit,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ sku }) => ({ type: 'Products' as const, id: sku })),
              { type: 'Products', id: 'LIST' },
            ]
          : [{ type: 'Products', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),
  }),
})

export const {
  useGetAllProductsQuery,
  useLazyGetAllProductsQuery,
} = productsApi