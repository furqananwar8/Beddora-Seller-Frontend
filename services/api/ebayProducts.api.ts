import { baseApi } from './baseApi'

export type EbayListingStatus = 'listed' | 'unlisted' | 'draft'

export interface EbayProduct {
  id: string
  sku: string
  title: string
  price: number
  image: string
  tags: string[]
  amazonProductLink?: string
  listingStatus: EbayListingStatus
  cogs: number
  fbmShippingCost: number | 'auto'
}

export interface EbayProductFilters {
  search?: string
  status?: EbayListingStatus
}

export const ebayProductsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEbayProducts: builder.query<EbayProduct[], EbayProductFilters>({
      query: (filters) => ({
        url: '/ebay/products',
        params: filters,
      }),
      providesTags: ['EbayProducts'],
    }),
    updateEbayProduct: builder.mutation<EbayProduct, Partial<EbayProduct> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/ebay/products/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['EbayProducts'],
    }),
    importEbayProducts: builder.mutation<void, FormData>({
      query: (formData) => ({
        url: '/ebay/products/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['EbayProducts'],
    }),
    exportEbayProducts: builder.mutation<Blob, void>({
      query: () => ({
        url: '/ebay/products/export',
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetEbayProductsQuery,
  useUpdateEbayProductMutation,
  useImportEbayProductsMutation,
  useExportEbayProductsMutation,
} = ebayProductsApi
