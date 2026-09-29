import { baseApi } from './baseApi'
import type {
  AmazonOption,
  InboundShipment,
  LabelType,
  Marketplace,
  PackingPlan,
  PackingSubmission,
  ReservedPoolItem,
  ShipFromAddress,
  ShipLegRequirement,
  ShipTrackingInput,
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
  /** A saved address, or a typed one (saved to the address book unless saveShipFromAddress is false). */
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
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

    /** sandbox: true when the backend sends the Amazon steps to the SP-API sandbox (FBA_SANDBOX). */
    getShipmentsConfig: builder.query<{ sandbox: boolean }, void>({
      query: () => ({ url: '/inventory/shipments/config' }),
    }),

    getShipmentPool: builder.query<ReservedPoolItem[], void>({
      query: () => ({ url: '/inventory/shipments/pool' }),
      // Allocations in the Planner change the FBA pool, and they invalidate Inventory
      providesTags: ['InboundShipments', 'Inventory'],
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

    /** What Amazon needs before this can be marked as shipped (tracking for own-carrier legs). */
    getShipRequirements: builder.mutation<{ legs: ShipLegRequirement[] }, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/ship-requirements`, method: 'GET' }),
    }),

    /** Confirms the shipment with Amazon, then deducts the stock. */
    markShipmentShipped: builder.mutation<InboundShipment, { id: string; tracking?: ShipTrackingInput[] }>({
      query: ({ id, tracking }) => ({ url: `/inventory/shipments/${id}/ship`, method: 'POST', body: { tracking: tracking ?? [] } }),
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

    /** The label file from our server's copy (PDF, or a zip when Amazon split it into several). */
    downloadShipmentLabels: builder.mutation<Blob, { id: string; type: LabelType }>({
      query: ({ id, type }) => ({
        url: `/inventory/shipments/${id}/labels/${type}/file`,
        responseHandler: (response) => (response.ok ? response.blob() : response.json()),
      }),
      // A retry can turn a failed copy into a ready one
      invalidatesTags: ['InboundShipments'],
    }),

    syncShipments: builder.mutation<InboundShipment[], void>({
      query: () => ({ url: '/inventory/shipments/sync', method: 'POST' }),
      invalidatesTags: ['InboundShipments'],
    }),
  }),
})

export const {
  useGetShipmentsQuery,
  useGetShipmentsConfigQuery,
  useGetShipmentPoolQuery,
  useCreateShipmentMutation,
  useUpdateShipmentItemsMutation,
  useCancelShipmentMutation,
  useMarkShipmentShippedMutation,
  useGetShipRequirementsMutation,
  useSubmitInboundPlanMutation,
  useGetPackingPlanMutation,
  useSubmitPackingMutation,
  useGetShipmentOptionsMutation,
  useConfirmShipmentOptionsMutation,
  useGenerateShipmentLabelsMutation,
  useDownloadShipmentLabelsMutation,
  useSyncShipmentsMutation,
} = inboundShipmentsApi
