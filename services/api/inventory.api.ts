import { baseApi } from './baseApi'

/**
 * Inventory API endpoints
 * 
 * Add your inventory-related API calls here.
 * This includes stock levels, products, alerts, etc.
 */

export interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  reorderLevel: number
  cost: number
  price: number
  category: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

export interface InventoryFilters {
  category?: string
  status?: Product['status']
  search?: string
  page?: number
  limit?: number
}

export interface InventoryResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<InventoryResponse, InventoryFilters>({
      query: (filters) => ({
        url: '/inventory/products',
        params: filters,
      }),
      providesTags: ['Inventory'],
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/inventory/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Inventory', id }],
    }),
    updateProduct: builder.mutation<Product, Partial<Product> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/inventory/products/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Inventory', id }, 'Inventory'],
    }),
    getLowStockProducts: builder.query<Product[], void>({
      query: () => '/inventory/products/low-stock',
      providesTags: ['Inventory'],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useUpdateProductMutation,
  useGetLowStockProductsQuery,
} = inventoryApi

