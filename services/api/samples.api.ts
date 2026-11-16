import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'

/** Where a sample stands; derived from its payment requests. FREE needs no payment. */
export type SampleStatus = 'FREE' | 'UNPAID' | 'REQUESTED' | 'PAID'
export type SampleType = 'FREE' | 'CHARGEABLE'

/** One sample entry of a PO, as the Samples screen and a SKU's history show it. Never part of stock. */
export interface SampleItem {
  id: number
  product: { id: number; sku: string | null; name: string }
  supplier: { id: number; name: string }
  purchaseOrder: { id: number; poNo: string }
  currency: string
  units: number
  /** 0 for a free sample. */
  unitPrice: number
  amount: number
  isFree: boolean
  status: SampleStatus
  requestId: number | null
  /** PR#10042 */
  requestNo: string | null
  requestedAt: string | null
  paidAt: string | null
  /** When it was added to the SKU's Samples section; null while it has not been. */
  inventoryAt: string | null
}

export interface SampleListParams {
  page: number
  limit: number
  search?: string
  supplierId?: number
  type?: SampleType
  status?: SampleStatus
  /** yyyy-MM-dd */
  inventoryFrom?: string
  inventoryTo?: string
}

export interface SampleSupplier {
  id: number
  name: string
}

export const samplesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getSamples: b.query<Page<SampleItem>, SampleListParams>({
      query: (params) => ({ url: '/inventory/samples', params }),
      providesTags: ['Inventory'],
    }),
    getSampleSuppliers: b.query<SampleSupplier[], void>({
      query: () => '/inventory/samples/suppliers',
      transformResponse: unwrap,
      providesTags: ['Inventory'],
    }),
    /** Every sample of a SKU that is in its Samples section, newest first. */
    getProductSamples: b.query<SampleItem[], number>({
      query: (productId) => `/inventory/samples/by-product/${productId}`,
      transformResponse: unwrap,
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetSamplesQuery, useGetSampleSuppliersQuery, useGetProductSamplesQuery } = samplesApi
