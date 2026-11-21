import { baseApi } from './baseApi'
import type { Page } from './finance.api'

export interface ProductManager {
  id: string
  name: string
  email: string
  /** The seller SKUs this manager looks after, per sales channel (`amazon`, `walmart`…). */
  products: ManagerProducts[]
}

export interface ManagerProducts {
  channel: string
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

export type ProductManagerInput = Pick<ProductManager, 'name' | 'email'>

/** The SKUs on one channel a manager is to look after (replaces the ones they had there). */
export type ProductAssignmentInput = ManagerProducts

/** Filters of the PM Managers list. */
export interface ProductManagerListParams {
  page: number
  limit: number
  search?: string
  /** Managers with products on any of these channels. */
  channels?: string[]
  assignment?: 'assigned' | 'unassigned'
}

/** A manager's SKUs on one channel. */
export const skusOn = (manager: ProductManager, channel: string): string[] => manager.products.find((group) => group.channel === channel)?.skus ?? []

const unwrap = <T,>(response: { data: T }) => response.data

/** Product managers on the PM incentive plan (Profit > PM Incentive). */
export const productManagersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Every manager: the incentive calculation works from all of them. */
    getProductManagers: builder.query<ProductManager[], void>({
      query: () => '/profit/product-managers/all',
      transformResponse: unwrap<ProductManager[]>,
      providesTags: ['ProductManagers'],
    }),

    /** One page of managers matching the search and filters. */
    getProductManagersPage: builder.query<Page<ProductManager>, ProductManagerListParams>({
      query: ({ search, channels, assignment, ...params }) => ({
        url: '/profit/product-managers',
        params: { ...params, search: search || undefined, channels: channels?.length ? channels.join(',') : undefined, assignment },
      }),
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

    /** Sets the manager's SKUs on every channel given, in one request. */
    assignManagerProducts: builder.mutation<ProductManager, { id: string; assignments: ProductAssignmentInput[] }>({
      query: ({ id, assignments }) => ({ url: `/profit/product-managers/${id}/products`, method: 'PUT', body: { assignments } }),
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
  useGetProductManagersPageQuery,
  useGetManagerChannelsQuery,
  useGetManagerChannelSkusQuery,
  useLazyGetManagerChannelSkusQuery,
  useCreateProductManagerMutation,
  useUpdateProductManagerMutation,
  useAssignManagerProductsMutation,
  useDeleteProductManagerMutation,
} = productManagersApi
