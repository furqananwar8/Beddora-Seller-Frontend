import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'
import type { FinanceDocument } from './finance.api'
import type { SupplierRef } from './procurement.api'

/** Where a sample stands; derived from its payment requests. FREE needs no payment. */
export type SampleStatus = 'FREE' | 'UNPAID' | 'REQUESTED' | 'PAID'
export type SampleType = 'FREE' | 'CHARGEABLE'

/** One sample entry of a PO, as the Samples screen and a SKU's history show it. Never part of stock. */
export interface SampleItem {
  id: number
  product: { id: number; sku: string | null; name: string }
  supplier: { id: number; name: string }
  /** The PO it is linked to; null while it stands alone. */
  purchaseOrder: { id: number; poNo: string } | null
  currency: string
  units: number
  /** 0 for a free sample. */
  unitPrice: number
  amount: number
  isFree: boolean
  /** Chargeable and linked to a PO with no request of its own: paid as part of that PO. */
  paidWithPo: boolean
  /** Files attached when the sample was made. */
  documents: FinanceDocument[]
  status: SampleStatus
  requestId: number | null
  /** PR#10042 */
  requestNo: string | null
  requestedAt: string | null
  paidAt: string | null
  /** When it was added to the SKU's Samples section; null while it has not been. */
  inventoryAt: string | null
  /** When the sample was added (made on a PO form or on the Samples screen). */
  createdAt: string
}

/**
 * One row of the Samples screen: every sample of one SKU from one supplier (the same SKU from another supplier is its
 * own row). `entries` are the individual samples, one per PO they came with or standalone, newest first.
 */
export interface SampleGroup {
  key: string
  product: { id: number; sku: string | null; name: string }
  supplier: { id: number; name: string }
  /** How many different POs these samples came with. */
  poCount: number
  /** Entries that are linked to no PO. */
  standaloneCount: number
  units: number
  type: 'FREE' | 'CHARGEABLE' | 'MIXED'
  /** What the chargeable entries add up to, per currency. */
  amounts: Array<{ currency: string; amount: number }>
  /** Entries paid as part of their PO (no payment state of their own). */
  withPoCount: number
  statuses: Array<{ status: SampleStatus; count: number }>
  /** Latest payment date among the entries. */
  paidAt: string | null
  documents: FinanceDocument[]
  entries: SampleItem[]
}

export interface SampleListParams {
  page: number
  limit: number
  search?: string
  supplierId?: number
  type?: SampleType
  status?: SampleStatus
}

/** Where one of a sample's files is served. */
export const sampleDocumentPath = (sampleId: number, documentId: string): string => `/inventory/samples/${sampleId}/documents/${documentId}`

/** A sample the PO form can link; `linkable` is false while it sits on an approved PO. */
/** `supplierRef` is the supplier as the PO form holds it, so linking can fill the supplier in. */
export type LinkableSample = SampleItem & { linkable: boolean; supplierRef: SupplierRef }

export interface LinkableSamplesParams {
  /** The PO being edited, so its own samples are not offered again. */
  purchaseOrderId?: number
}

export interface SampleSupplier {
  id: number
  name: string
}

export const samplesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getSamples: b.query<Page<SampleGroup>, SampleListParams>({
      query: (params) => ({ url: '/inventory/samples', params }),
      providesTags: ['Inventory'],
    }),
    /** A sample made on the Samples screen, with its files: multipart fields supplierId, currency, productId, units, unitPrice and documents. A free sample has a unit price of 0. */
    createSample: b.mutation<SampleItem, FormData>({
      query: (body) => ({ url: '/inventory/samples', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Inventory'],
    }),
    deleteSample: b.mutation<void, number>({
      query: (id) => ({ url: `/inventory/samples/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Inventory'],
    }),
    /** Existing unpaid samples of a supplier, for the PO form's "Link existing sample". */
    getLinkableSamples: b.query<LinkableSample[], LinkableSamplesParams>({
      query: (params) => ({ url: '/procurement/purchase-orders/linkable-samples', params }),
      transformResponse: unwrap,
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

export const { useGetSamplesQuery, useGetSampleSuppliersQuery, useGetProductSamplesQuery, useCreateSampleMutation, useDeleteSampleMutation, useGetLinkableSamplesQuery } = samplesApi
