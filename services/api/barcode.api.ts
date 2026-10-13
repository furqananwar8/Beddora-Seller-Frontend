import { baseApi } from './baseApi'
import { unwrap, type Page, type PageParams } from './finance.api'

export type ScanSource = 'serial' | 'keyboard'

/** What a scanned code contains; the raw text is always kept in `barcode`. */
export type BarcodeDataType = 'text' | 'number' | 'json' | 'url' | 'gs1' | 'keyvalue'

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
