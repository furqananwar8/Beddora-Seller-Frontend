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
  totalCOGS: number
  totalCOGSQty: number
  cogsPerUnit: number
  salesVelocity: number
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
  endpoints: (builder) => ({
    getAllProducts: builder.query<ProductsResponse, ProductFilters>({
      query: (filters) => ({
        url: '/products',
        params: filters,
      }),
      providesTags: ['Products'],
    }),
  }),
})

export const {
  useGetAllProductsQuery,
  useLazyGetAllProductsQuery,
} = productsApi