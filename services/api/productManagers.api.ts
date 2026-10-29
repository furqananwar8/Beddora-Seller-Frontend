import { baseApi } from './baseApi'

export interface ProductManager {
  id: string
  name: string
  email: string
  /** Amazon seller SKUs this manager looks after. */
  skus: string[]
}

export type ProductManagerInput = Omit<ProductManager, 'id'>

const unwrap = <T,>(response: { data: T }) => response.data

/** Product managers on the PM incentive plan (Profit > PM Incentive). */
export const productManagersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductManagers: builder.query<ProductManager[], void>({
      query: () => '/profit/product-managers',
      transformResponse: unwrap<ProductManager[]>,
      providesTags: ['ProductManagers'],
    }),

    createProductManager: builder.mutation<ProductManager, ProductManagerInput>({
      query: (body) => ({ url: '/profit/product-managers', method: 'POST', body }),
      transformResponse: unwrap<ProductManager>,
      invalidatesTags: ['ProductManagers'],
    }),

    updateProductManager: builder.mutation<ProductManager, { id: string; body: ProductManagerInput }>({
      query: ({ id, body }) => ({ url: `/profit/product-managers/${id}`, method: 'PUT', body }),
      transformResponse: unwrap<ProductManager>,
      invalidatesTags: ['ProductManagers'],
    }),

    deleteProductManager: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/profit/product-managers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProductManagers'],
    }),
  }),
})

export const { useGetProductManagersQuery, useCreateProductManagerMutation, useUpdateProductManagerMutation, useDeleteProductManagerMutation } = productManagersApi
