import { baseApi } from './baseApi'
import { unwrap, type Page, type PageParams } from './finance.api'

export type ScanSource = 'serial' | 'keyboard' | 'handheld'

/** What a scanned code contains; the raw text is always kept in `barcode`. */
export type BarcodeDataType = 'text' | 'number' | 'json' | 'url' | 'gs1' | 'shipping_label' | 'keyvalue'

/** A carrier's shipping label in one shape whatever its barcode layout (payload of 'shipping_label' scans). */
export interface ShippingLabel {
  format: string
  carrier?: string
  trackingNumber?: string
  serviceClass?: string
  shipDate?: string
  weight?: { value: number; unit: string }
  package?: { number: number; total: number }
  recipient?: {
    name?: string
    addressLines?: string[]
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  /** Every element read from the barcode. */
  fields: Record<string, string>
}

export interface BarcodeScan {
  id: number
  barcode: string
  source: ScanSource
  /** What the browser knows about the scanner (e.g. USB vendor / product id). */
  device: Record<string, unknown> | null
  dataType: BarcodeDataType
  /** The content parsed into structure (any JSON value) when it has one; null for plain text and numbers. */
  payload: unknown | null
  scannedAt: string
  scannedBy: { id: number; name: string | null } | null
}

export interface NewBarcodeScan {
  barcode: string
  source: ScanSource
  device?: Record<string, unknown>
  scannedAt?: string
}

export const barcodeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getBarcodeScans: b.query<Page<BarcodeScan>, PageParams>({
      query: ({ search, ...params }) => ({ url: '/barcode/scans', params: { ...params, search: search || undefined } }),
      providesTags: ['Barcode'],
    }),
    createBarcodeScan: b.mutation<BarcodeScan, NewBarcodeScan>({
      query: (body) => ({ url: '/barcode/scans', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
  }),
})

export const { useGetBarcodeScansQuery, useCreateBarcodeScanMutation } = barcodeApi
