import { baseApi } from './baseApi'
import type {
  AmazonOption,
  InboundShipment,
  LabelType,
  Marketplace,
  PackingPlan,
  PackingSubmission,
  ReservedPoolItem,
} from '@/features/inventory/shipments/types'

export type OptionKind = 'placement' | 'window' | 'transport'

export interface ShipmentLineInput {
  inventoryItemId: number
  quantity: number
}

export interface CreateShipmentRequest {
  name: string
  marketplace: Marketplace
  items: ShipmentLineInput[]
}

export interface LabelDownload {
  label: string // e.g. "FBA15ABC · YYZ4"
  url: string
}

/**
 * FBA inbound shipments. Local actions reserve / release / ship stock; the
 * Amazon steps run the SP-API Fulfillment Inbound v2024-03-20 workflow on the
 * backend (which polls Amazon's async operations before responding).
 */
export const inboundShipmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipments: builder.query<InboundShipment[], void>({
      query: () => ({ url: '/inventory/shipments' }),
      providesTags: ['InboundShipments'],
    }),

    getShipmentPool: builder.query<ReservedPoolItem[], void>({
      query: () => ({ url: '/inventory/shipments/pool' }),
      providesTags: ['InboundShipments'],
    }),

    createShipment: builder.mutation<InboundShipment, CreateShipmentRequest>({
      query: (body) => ({ url: '/inventory/shipments', method: 'POST', body }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    updateShipmentItems: builder.mutation<InboundShipment, { id: string; items: ShipmentLineInput[] }>({
      query: ({ id, items }) => ({ url: `/inventory/shipments/${id}/items`, method: 'PATCH', body: { items } }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    cancelShipment: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    markShipmentShipped: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/ship`, method: 'POST' }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    // ── Amazon workflow
    submitInboundPlan: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/inbound-plan`, method: 'POST' }),
      invalidatesTags: ['InboundShipments'],
    }),

    getPackingPlan: builder.mutation<PackingPlan, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/packing`, method: 'POST' }),
    }),

    submitPacking: builder.mutation<InboundShipment, { id: string; packing: PackingSubmission }>({
      query: ({ id, packing }) => ({ url: `/inventory/shipments/${id}/packing/confirm`, method: 'POST', body: packing }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    getShipmentOptions: builder.mutation<AmazonOption[], { id: string; kind: OptionKind }>({
      query: ({ id, kind }) => ({ url: `/inventory/shipments/${id}/options/${kind}`, method: 'POST' }),
    }),

    confirmShipmentOptions: builder.mutation<InboundShipment, { id: string; kind: OptionKind; optionIds: string[] }>({
      query: ({ id, kind, optionIds }) => ({
        url: `/inventory/shipments/${id}/options/${kind}/confirm`,
        method: 'POST',
        body: { optionIds },
      }),
      invalidatesTags: ['InboundShipments'],
    }),

    generateShipmentLabels: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/labels`, method: 'POST' }),
      invalidatesTags: ['InboundShipments'],
    }),

    getShipmentLabels: builder.mutation<LabelDownload[], { id: string; type: LabelType }>({
      query: ({ id, type }) => ({ url: `/inventory/shipments/${id}/labels/${type}` }),
    }),

    syncShipments: builder.mutation<InboundShipment[], void>({
      query: () => ({ url: '/inventory/shipments/sync', method: 'POST' }),
      invalidatesTags: ['InboundShipments'],
    }),
  }),
})

export const {
  useGetShipmentsQuery,
  useGetShipmentPoolQuery,
  useCreateShipmentMutation,
  useUpdateShipmentItemsMutation,
  useCancelShipmentMutation,
  useMarkShipmentShippedMutation,
  useSubmitInboundPlanMutation,
  useGetPackingPlanMutation,
  useSubmitPackingMutation,
  useGetShipmentOptionsMutation,
  useConfirmShipmentOptionsMutation,
  useGenerateShipmentLabelsMutation,
  useGetShipmentLabelsMutation,
  useSyncShipmentsMutation,
} = inboundShipmentsApi
