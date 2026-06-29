import { baseApi } from './baseApi'

export interface AutoresponderProduct {
  id: string
  sku: string
  title: string
  imageUrl: string
  campaign?: string
  nickname?: string
}

export interface ProductFilters {
  search?: string
}

export const autoresponderProductsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutoresponderProducts: builder.query<AutoresponderProduct[], ProductFilters>({
      query: (filters) => ({
        url: '/api/autoresponder/products',
        params: filters,
      }),
      providesTags: ['AutoresponderProducts'],
    }),
    updateAutoresponderProduct: builder.mutation<AutoresponderProduct, { id: string; data: Partial<AutoresponderProduct> }>({
      query: ({ id, data }) => ({
        url: `/api/autoresponder/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AutoresponderProducts'],
    }),
    importAutoresponderProducts: builder.mutation<void, FormData>({
      query: (formData) => ({
        url: '/api/autoresponder/products/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['AutoresponderProducts'],
    }),
  }),
})

export const {
  useGetAutoresponderProductsQuery,
  useUpdateAutoresponderProductMutation,
  useImportAutoresponderProductsMutation,
} = autoresponderProductsApi
