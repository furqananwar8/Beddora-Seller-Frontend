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
  /** Someone else holds this record right now. */
  lockedBy: { id: number; name: string | null; since: string } | null
  resume: { id: number; direction: ScanDirection } | null
  /** Directions whose scanning was closed for good, and who closed them. */
  closed: Record<ScanDirection, { by: string | null; at: string } | null>
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

export interface ScanLineScans {
  items: Array<{ id: number; upc: string; scannedAt: string; condition: ReturnCondition | null }>
  total: number
  hasMore: boolean
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
  channel: string | null
  /** Holds the session now. */
  by: { id: number; name: string | null }
  /** Started it; unchanged after a takeover. */
  startedBy: { id: number; name: string | null }
  startedAt: string
  endedAt: string | null
  expected: number
  scanned: number
  matched: number
  notMatched: number
  /** Units the stock movement used; 0 until the session ends. */
  unitsApplied: number
  differences: ScanDifferences
}

export interface ScanAppliedLine {
  inventoryItemId: number
  sku: string
  upc: string | null
  expected: number
  scanned: number
  applied: number
}

export interface ScanUnmatched {
  upc: string
  reason: 'NOT_IN_CATALOG' | 'NOT_ON_RECORD'
  sku: string | null
  count: number
  firstScannedAt: string
  lastScannedAt: string
}

export interface ScanSessionStats {
  sessions: number
  inProgress: number
  matched: number
  notMatched: number
  matchedPercent: number
  unitsIn: number
  unitsOut: number
  unitsAdjusted: number
}

export interface ScanLock {
  sessionId: number
  scenario: ScanScenario
  sourceId: string
  by: { id: number; name: string | null }
  mine: boolean
  since: string
  /** False once the owner stopped renewing the lock: the record can be taken over. */
  live: boolean
}

export type ScanListStatus = 'IN_PROGRESS' | 'COMPLETED' | 'COMPLETED_UNMATCHED' | 'DISCARDED'

export interface ScanSessionFilters {
  scenario?: ScanScenario
  direction?: ScanDirection
  status?: ScanListStatus
  channel?: string
  startedBy?: number
  from?: string
  to?: string
}

export interface ScanSession extends ScanSessionSummary {
  mine: boolean
  lines: ScanSessionLine[]
  latest: ScanSessionScan[]
  applied: ScanAppliedLine[]
  unmatched: ScanUnmatched[]
  /** Scans past the quantity a shipment or order holds, refused since the last read (reported once). */
  refused: Array<{ upc: string; sku: string; expected: number; at: number }>
  /** Scans still waiting to be matched. */
  pending: number
}

/* ─────────────── Manual returns ─────────────── */

export interface ManualReturnOption {
  id: string
  label: string
  markets: Array<{ country: string; label: string }>
}

/** A channel listing mapped to our products, offered when picking the returned item. */
export interface ManualReturnProduct {
  channelSku: string
  name: string
  components: Array<{ sku: string; name: string; quantity: number }>
}

export interface ManualReturnMetadata {
  name: string
  value: string
}

export interface ManualReturn {
  id: number
  channel: string
  channelLabel: string
  marketplace: string
  channelSku: string
  productName: string | null
  units: number
  sellableUnits: number
  damagedUnits: number
  remarks: string | null
  metadata: ManualReturnMetadata[]
  by: { id: number; name: string | null }
  createdAt: string
  lines: Array<{ sku: string; sellableQty: number; damagedQty: number }>
}

export interface NewManualReturn {
  channel: string
  marketplace: string
  channelSku: string
  units: number
  /** Of `units`: how many were damaged; the rest were sellable. */
  damagedUnits: number
  remarks?: string
  metadata: ManualReturnMetadata[]
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
    getScanSessions: b.query<Page<ScanSessionSummary>, PageParams & ScanSessionFilters>({
      query: ({ search, ...params }) => ({ url: '/barcode/sessions', params: { ...params, search: search || undefined } }),
      providesTags: ['Barcode'],
    }),
    getScanSessionStats: b.query<ScanSessionStats, void>({
      query: () => '/barcode/sessions/stats',
      transformResponse: unwrap,
      providesTags: ['Barcode'],
    }),
    getScanStarters: b.query<Array<{ id: number; name: string | null }>, void>({
      query: () => '/barcode/sessions/starters',
      transformResponse: unwrap,
      providesTags: ['Barcode'],
    }),
    getScanLocks: b.query<ScanLock[], { scenario?: ScanScenario } | void>({
      query: (params) => ({ url: '/barcode/sessions/locks', params: params ?? undefined }),
      transformResponse: unwrap,
      providesTags: ['Barcode'],
    }),
    startScanSession: b.mutation<ScanSession, { scenario: ScanScenario; sourceId: string; direction: ScanDirection }>({
      query: (body) => ({ url: '/barcode/sessions', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    // The scan is only queued; the open modal polls the session, and each read matches the queued scans in one batch
    addSessionScan: b.mutation<{ queued: true }, { id: number; upc: string }>({
      query: ({ id, ...body }) => ({ url: `/barcode/sessions/${id}/scans`, method: 'POST', body }),
      transformResponse: unwrap,
    }),
    getScanLineScans: b.query<ScanLineScans, { id: number; inventoryItemId: number; offset: number; limit: number }>({
      query: ({ id, inventoryItemId, ...params }) => ({ url: `/barcode/sessions/${id}/lines/${inventoryItemId}/scans`, params }),
      transformResponse: unwrap,
    }),
    // Closes a record's scanning for good; an open session of yours is ended first
    closeScanRecord: b.mutation<{ closed: true }, { scenario: ScanScenario; sourceId: string; direction: ScanDirection }>({
      query: (body) => ({ url: '/barcode/sessions/close', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode', 'InboundShipments', 'Inventory'],
    }),
    undoSessionScan: b.mutation<ScanSession, { id: number; scanId: number }>({
      query: ({ id, scanId }) => ({ url: `/barcode/sessions/${id}/scans/${scanId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode'],
    }),
    // `conditions`: per inventory item id, how many units were damaged / a normal return; the rest are sellable
    endScanSession: b.mutation<ScanSession, { id: number; confirmed: boolean; conditions?: Record<number, Partial<Record<ReturnCondition, number>>> }>({
      query: ({ id, ...body }) => ({ url: `/barcode/sessions/${id}/end`, method: 'POST', body }),
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
    getManualReturnOptions: b.query<ManualReturnOption[], void>({
      query: () => '/barcode/manual-returns/options',
      transformResponse: unwrap,
      keepUnusedDataFor: 600,
    }),
    getManualReturnProducts: b.query<ManualReturnProduct[], { channel: string; marketplace: string; search?: string }>({
      query: ({ search, ...params }) => ({ url: '/barcode/manual-returns/products', params: { ...params, search: search || undefined } }),
      transformResponse: unwrap,
    }),
    getManualReturns: b.query<Page<ManualReturn>, PageParams>({
      query: ({ search, ...params }) => ({ url: '/barcode/manual-returns', params: { ...params, search: search || undefined } }),
      providesTags: ['Barcode'],
    }),
    // Puts the units back into stock, so the inventory screens refresh too
    createManualReturn: b.mutation<ManualReturn, NewManualReturn>({
      query: (body) => ({ url: '/barcode/manual-returns', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Barcode', 'Inventory', 'InboundShipments'],
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
  useGetScanSessionStatsQuery,
  useGetScanLocksQuery,
  useGetScanStartersQuery,
  useStartScanSessionMutation,
  useAddSessionScanMutation,
  useLazyGetScanLineScansQuery,
  useGetManualReturnOptionsQuery,
  useGetManualReturnProductsQuery,
  useGetManualReturnsQuery,
  useCreateManualReturnMutation,
  useCloseScanRecordMutation,
  useUndoSessionScanMutation,
  useEndScanSessionMutation,
  useDiscardScanSessionMutation,
  useScanSessionHeartbeatMutation,
} = barcodeApi
