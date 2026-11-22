import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'
import type { ContainerStatus } from './procurement.api'

/** The statuses Inbound Receiving shows: waiting to be counted, and already counted. */
export type ReceivingStatus = Extract<ContainerStatus, 'DELIVERED_AT_WAREHOUSE' | 'GOODS_RECEIVED'>

/** Units per outcome across a container's lines (zero for those not received yet); the packing list's cartons are kept for the heading. */
export interface ReceivingTotals {
  expectedUnits: number
  expectedCartons: number
  goodUnits: number
  damagedUnits: number
  shortageUnits: number
  actualUnits: number
}

/** What barcode scanning has received so far, in units (the receipt is only confirmed when it is signed). */
export interface ReceivingScanned {
  expectedUnits: number
  goodUnits: number
  damagedUnits: number
  /** Expected units not scanned in, per product. */
  shortUnits: number
  /** Scanned units beyond what the packaging list expected. */
  overUnits: number
  /** Anything was scanned in yet. */
  started: boolean
  /** Scanning was closed for good, so short is final. */
  closed: boolean
}

export type ReceivingLineScanned = Pick<ReceivingScanned, 'goodUnits' | 'damagedUnits' | 'shortUnits' | 'overUnits'>

export interface ReceivingIdentity {
  id: number
  /** Our reference, CID#…. */
  containerNo: string
  /** The shipping line's container number. */
  containerNumber: string | null
  poNos: string[]
  plNos: string[]
  /** The same numbers with their record ids, to link to each. */
  poLinks: Array<{ no: string; id: number }>
  plLinks: Array<{ no: string; id: number }>
}

export interface ReceivingListItem extends ReceivingIdentity {
  status: ReceivingStatus
  deliveredAt: string | null
  receivedAt: string | null
  receivedBy: string | null
  totals: ReceivingTotals
  scanned: ReceivingScanned
}

export interface ReceivingLine {
  lineId: number
  plNo: string
  poNo: string
  productId: number
  sku: string
  name: string
  /** What the packaging list says is in the line, in units (counted by the receiver) and in cartons. */
  expectedUnits: number
  expectedCartons: number
  unitsPerCarton: number
  /** Null until the receipt is confirmed. */
  goodUnits: number | null
  damagedUnits: number | null
  shortageUnits: number | null
  actualUnits: number | null
  scanned: ReceivingLineScanned
}

export interface ReceivingDetail extends ReceivingIdentity {
  status: ReceivingStatus
  lines: ReceivingLine[]
  totals: ReceivingTotals
  scanned: ReceivingScanned
  receipt: { receivedAt: string; receivedBy: string; signature: string } | null
}

export interface ReceivingListParams {
  page: number
  limit: number
  search?: string
  status?: ReceivingStatus
}

export interface ConfirmReceivingBody {
  lines: Array<{ lineId: number; goodUnits: number; damagedUnits: number; shortageUnits: number }>
  /** PNG data URL of the drawn signature. */
  signature: string
}

export const inboundReceivingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getReceivingList: b.query<Page<ReceivingListItem>, ReceivingListParams>({
      query: ({ search, status, ...params }) => ({ url: '/inventory/inbound-receiving', params: { ...params, search: search || undefined, status } }),
      providesTags: ['InboundReceiving'],
    }),
    getReceiving: b.query<ReceivingDetail, number>({
      query: (id) => `/inventory/inbound-receiving/${id}`,
      transformResponse: unwrap,
      providesTags: ['InboundReceiving'],
    }),
    confirmReceiving: b.mutation<ReceivingDetail, { id: number; body: ConfirmReceivingBody }>({
      query: ({ id, body }) => ({ url: `/inventory/inbound-receiving/${id}/confirm`, method: 'POST', body }),
      transformResponse: unwrap,
      // The container moves to GOODS_RECEIVED and its damaged units land in warehouse inventory
      invalidatesTags: ['InboundReceiving', 'ProcurementContainers', 'Inventory'],
    }),
  }),
})

export const { useGetReceivingListQuery, useGetReceivingQuery, useConfirmReceivingMutation } = inboundReceivingApi
