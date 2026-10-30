import { baseApi } from './baseApi'

export interface ProductManager {
  id: string
  name: string
  email: string
  /** The sales channel the SKUs belong to (`amazon`, `walmart`…). */
  channel: string
  /** Seller SKUs on that channel this manager looks after. */
  skus: string[]
}

export interface ManagerChannel {
  id: string
  name: string
}

export interface ChannelSkuOption {
  sku: string
  title: string
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

    getManagerChannels: builder.query<ManagerChannel[], void>({
      query: () => '/profit/product-managers/channels',
      transformResponse: unwrap<ManagerChannel[]>,
    }),

    getManagerChannelSkus: builder.query<ChannelSkuOption[], string>({
      query: (channel) => ({ url: '/profit/product-managers/skus', params: { channel } }),
      transformResponse: unwrap<ChannelSkuOption[]>,
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

export const {
  useGetProductManagersQuery,
  useGetManagerChannelsQuery,
  useGetManagerChannelSkusQuery,
  useCreateProductManagerMutation,
  useUpdateProductManagerMutation,
  useDeleteProductManagerMutation,
} = productManagersApi
