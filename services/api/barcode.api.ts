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

export type ScanScenario = 'FBA_WFS' | 'FBM_ORDER' | 'CONTAINER'
export type ScanDirection = 'IN' | 'OUT'
export type ScanSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DISCARDED'
/** The state a returned unit came back in; decides where its stock lands. */
export type ReturnCondition = 'SELLABLE' | 'NORMAL_RETURN' | 'DAMAGED'

export interface ScanSourceInfo {
  ref: string
  /** Null when the direction can be scanned, else why not. */
  availability: Record<ScanDirection, string | null>
  resume: { id: number; direction: ScanDirection } | null
  conditions: Array<{ value: ReturnCondition; label: string }>
}

export type ScanLineState = 'NOT_STARTED' | 'IN_PROGRESS' | 'MATCHED' | 'OVER'

export interface ScanSessionLine {
  inventoryItemId: number
  sku: string
  upc: string | null
  channelSku: string | null
  expected: number
  scanned: number
  state: ScanLineState
}

export interface ScanSessionScan {
  id: number
  upc: string
  sku: string | null
  state: 'COUNTED' | 'NOT_ON_RECORD' | 'NOT_IN_INVENTORY'
  condition: ReturnCondition | null
  scannedAt: string
}

export interface ScanDifferences {
  short: number
  over: number
  notOnRecord: number
  unmatched: number
}

export interface ScanSessionSummary {
  id: number
  scenario: ScanScenario
  direction: ScanDirection
  status: ScanSessionStatus
  ref: string
  sourceId: string
  by: { id: number; name: string | null }
  startedAt: string
  endedAt: string | null
  expected: number
  scanned: number
  differences: ScanDifferences
}

export interface ScanSession extends ScanSessionSummary {
  mine: boolean
  lines: ScanSessionLine[]
  latest: ScanSessionScan[]
}

export const barcodeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getScanSource: b.query<ScanSourceInfo, { scenario: ScanScenario; sourceId: string }>({
      query: (params) => ({ url: '/barcode/sessions/source', params }),
      transformResponse: unwrap,
      providesTags: ['Barcode'],
    }),
    getScanSession: b.query<ScanSession, number>({
      query: (id) => `/barcode/sessions/${id}`,
      transformResponse: unwrap,
      providesTags: ['Barcode'],
    }),
    getScanSessions: b.query<Page<ScanSessionSummary>, PageParams & { scenario?: ScanScenario; direction?: ScanDirection }>({
      query: ({ search, ...params }) => ({ url: '/barcode/sessions', params: { ...params, search: search || undefined } }),
      providesTags: ['Barcode'],
    }),
    startScanSession: b.mutation<ScanSession, { scenario: ScanScenario; sourceId: string; direction: ScanDirection }>({
      query: (body) => ({ url: '/barcode/sessions', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    addSessionScan: b.mutation<ScanSession, { id: number; upc: string; condition?: ReturnCondition }>({
      query: ({ id, ...body }) => ({ url: `/barcode/sessions/${id}/scans`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    undoSessionScan: b.mutation<ScanSession, { id: number; scanId: number }>({
      query: ({ id, scanId }) => ({ url: `/barcode/sessions/${id}/scans/${scanId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    endScanSession: b.mutation<ScanSession, { id: number; confirmed: boolean }>({
      query: ({ id, confirmed }) => ({ url: `/barcode/sessions/${id}/end`, method: 'POST', body: { confirmed } }),
      transformResponse: unwrap,
      // Ending moves stock and can make a shipment Scanned and Shipped
      invalidatesTags: ['Barcode', 'InboundShipments', 'Inventory'],
    }),
    discardScanSession: b.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/barcode/sessions/${id}/discard`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    scanSessionHeartbeat: b.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/barcode/sessions/${id}/heartbeat`, method: 'POST' }),
      transformResponse: unwrap,
    }),
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

export const {
  useGetBarcodeScansQuery,
  useCreateBarcodeScanMutation,
  useGetScanSourceQuery,
  useGetScanSessionQuery,
  useGetScanSessionsQuery,
  useStartScanSessionMutation,
  useAddSessionScanMutation,
  useUndoSessionScanMutation,
  useEndScanSessionMutation,
  useDiscardScanSessionMutation,
  useScanSessionHeartbeatMutation,
} = barcodeApi
