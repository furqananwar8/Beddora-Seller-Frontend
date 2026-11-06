import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'
import type { ContainerStatus } from './procurement.api'

/** The statuses Inbound Receiving shows: waiting to be counted, and already counted. */
export type ReceivingStatus = Extract<ContainerStatus, 'DELIVERED_AT_WAREHOUSE' | 'GOODS_RECEIVED'>

/** Cartons per outcome across a container's lines (zero for those not received yet). */
export interface ReceivingTotals {
  expectedCartons: number
  goodCartons: number
  damagedCartons: number
  shortageCartons: number
  actualCartons: number
}

export interface ReceivingIdentity {
  id: number
  /** Our reference, CID#…. */
  containerNo: string
  /** The shipping line's container number. */
  containerNumber: string | null
  poNos: string[]
  plNos: string[]
}

export interface ReceivingListItem extends ReceivingIdentity {
  status: ReceivingStatus
  deliveredAt: string | null
  receivedAt: string | null
  receivedBy: string | null
  totals: ReceivingTotals
}

export interface ReceivingLine {
  lineId: number
  plNo: string
  poNo: string
  productId: number
  sku: string
  name: string
  /** Cartons the packaging list says are in the container. */
  expectedCartons: number
  unitsPerCarton: number
  /** Null until the receipt is confirmed. */
  goodCartons: number | null
  damagedCartons: number | null
  shortageCartons: number | null
  actualCartons: number | null
}

export interface ReceivingDetail extends ReceivingIdentity {
  status: ReceivingStatus
  lines: ReceivingLine[]
  totals: ReceivingTotals
  receipt: { receivedAt: string; receivedBy: string; signature: string } | null
}

export interface ReceivingListParams {
  page: number
  limit: number
  search?: string
  status?: ReceivingStatus
}

export interface ConfirmReceivingBody {
  lines: Array<{ lineId: number; goodCartons: number; damagedCartons: number; shortageCartons: number }>
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
