import { baseApi } from './baseApi'
import type {
  AmazonOption,
  CarrierQuote,
  InboundShipment,
  LabelType,
  Marketplace,
  PackingPlan,
  PackingSubmission,
  ReservedPoolItem,
  ShipFromAddress,
  ShipLegRequirement,
  ShipmentChannel,
  ShipTrackingInput,
  WfsCarrierEntry,
  WfsCartons,
} from '@/features/inventory/shipments/types'

import type { LabelFormatCatalog } from '@/features/inventory/shipments/labelFormats'

/** One marketplace a channel ships to, with its optional features (WFS: connected, inventoryTransfer, walmartCarrier). */
export interface ChannelMarketplaceConfig {
  id: Marketplace
  label: string
  country: string
  currency: string
  capabilities: Record<string, boolean>
}

export interface ChannelConfig {
  id: ShipmentChannel
  label: string
  enabled: boolean
  disabledReason?: string
  sandbox: boolean
  marketplaces: ChannelMarketplaceConfig[]
  labelFormats: LabelFormatCatalog
}

export interface ShipmentsConfig {
  /** Amazon FBA sandbox (FBA_SANDBOX); per-channel flags are in `channels`. */
  sandbox: boolean
  /** Printable label sizes the backend offers for box and FNSKU labels. */
  labelFormats?: LabelFormatCatalog
  /** Every channel the backend supports; missing on servers that predate channels. */
  channels?: ChannelConfig[]
}

export interface PoolArg {
  channel: ShipmentChannel
  /** WFS: eligibility depends on the marketplace's Walmart listings. */
  marketplace?: Marketplace
}

export type OptionKind = 'placement' | 'window'

/** The step a shipment can go back to and redo. */
export type RewindTarget = 'packing' | 'placement' | 'window' | 'carrier'

export interface RewindResponse {
  shipment: InboundShipment
  /** Set when an earlier answer couldn't be replayed, so the seller lands on that step instead. */
  notice?: string
}

export interface CarrierEntry {
  shipmentId: string
  carrier: string
  /** YYYY-MM-DD. Amazon is also told it as the ready-to-ship date the first time. */
  pickupDate: string
  /** YYYY-MM-DD. Our own record only. */
  deliveryDate: string
  /** Our own record only; never sent to Amazon. */
  amazonAppointmentId?: string
}

export interface ShipmentLineInput {
  inventoryItemId: number
  quantity: number
  /** WFS: sellable units per case; the quantity is whole cases of it. */
  unitsPerCase?: number
}

export interface CreateShipmentRequest {
  /** Omitted for FBA, as before channels. */
  channel?: ShipmentChannel
  name: string
  marketplace: Marketplace
  items: ShipmentLineInput[]
  /** WFS: YYYY-MM-DD the inventory should reach Walmart. */
  expectedDeliveryDate?: string
  /** WFS (Walmart.US): ship everything to one FC and let Walmart redistribute it. */
  inventoryTransfer?: boolean
  /** A saved address, or a typed one (saved to the address book unless saveShipFromAddress is false). */
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
}

export interface CreateShipmentArg extends CreateShipmentRequest {
  /** Client only: keep the new draft out of the list until the follow-up call finishes. */
  deferListRefresh?: boolean
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
    getShipmentsConfig: builder.query<ShipmentsConfig, void>({
      query: () => ({ url: '/inventory/shipments/config' }),
    }),

    /** Without an argument: the FBA pool (as before channels). */
    getShipmentPool: builder.query<ReservedPoolItem[], PoolArg | void>({
      query: (arg) => ({
        url: '/inventory/shipments/pool',
        params: arg ? { channel: arg.channel, ...(arg.marketplace ? { marketplace: arg.marketplace } : {}) } : undefined,
      }),
      // Allocations in the Planner change the FBA pool, and they invalidate Inventory
      providesTags: ['InboundShipments', 'Inventory'],
    }),

    createShipment: builder.mutation<InboundShipment, CreateShipmentArg>({
      query: ({ deferListRefresh: _defer, ...body }) => ({ url: '/inventory/shipments', method: 'POST', body }),
      // When the caller goes straight on to the Amazon plan, the plan call refreshes the list instead
      invalidatesTags: (_result, _error, arg) => (arg.deferListRefresh ? ['Inventory'] : ['InboundShipments', 'Inventory']),
    }),

    updateShipmentItems: builder.mutation<InboundShipment, { id: string; items: ShipmentLineInput[]; expectedDeliveryDate?: string }>({
      query: ({ id, ...body }) => ({ url: `/inventory/shipments/${id}/items`, method: 'PATCH', body }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    cancelShipment: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['InboundShipments', 'Inventory'],
    }),

    /** Changes where a draft ships from (drafts only; a plan sent to Amazon keeps its address). */
    updateShipmentShipFrom: builder.mutation<
      InboundShipment,
      { id: string; shipFromAddressId?: number; shipFromAddress?: ShipFromAddress; saveShipFromAddress?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/inventory/shipments/${id}/ship-from`, method: 'PATCH', body }),
      invalidatesTags: ['InboundShipments'],
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

    /** The seller's own carrier per Amazon shipment; the backend tells Amazon the shipment ships with it. */
    submitShipmentCarrier: builder.mutation<InboundShipment, { id: string; carriers: CarrierEntry[] }>({
      query: ({ id, ...body }) => ({ url: `/inventory/shipments/${id}/carrier`, method: 'POST', body }),
      invalidatesTags: ['InboundShipments'],
    }),

    /** Back: redo an earlier step. A new ship-from address can ride along when redoing packing or the warehouse. */
    rewindShipment: builder.mutation<
      RewindResponse,
      { id: string; to: RewindTarget; shipFromAddressId?: number; shipFromAddress?: ShipFromAddress; saveShipFromAddress?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/inventory/shipments/${id}/rewind`, method: 'POST', body }),
      invalidatesTags: ['InboundShipments'],
    }),

    generateShipmentLabels: builder.mutation<InboundShipment, string>({
      query: (id) => ({ url: `/inventory/shipments/${id}/labels`, method: 'POST' }),
      invalidatesTags: ['InboundShipments'],
    }),

    /** The label file from our server's copy (PDF, or a zip when Amazon split it into several). */
    downloadShipmentLabels: builder.mutation<Blob, { id: string; type: LabelType; format?: string }>({
      query: ({ id, type, format }) => ({
        url: `/inventory/shipments/${id}/labels/${type}/file`,
        params: format ? { format } : undefined,
        responseHandler: (response) => (response.ok ? response.blob() : response.json()),
      }),
      // A retry can turn a failed copy into a ready one
      invalidatesTags: ['InboundShipments'],
    }),

    // ── Walmart WFS steps (same endpoints, WFS bodies)

    /** Cartons per Walmart shipment. */
    submitWfsCartons: builder.mutation<InboundShipment, { id: string; legs: WfsCartons[] }>({
      query: ({ id, legs }) => ({ url: `/inventory/shipments/${id}/packing/confirm`, method: 'POST', body: { legs } }),
      invalidatesTags: ['InboundShipments'],
    }),

    /** Walmart's carrier rates for one Walmart shipment (Walmart.com, small parcel). */
    quoteWfsCarrier: builder.mutation<{ quotes: CarrierQuote[] }, { id: string; shipmentId: string }>({
      query: ({ id, shipmentId }) => ({ url: `/inventory/shipments/${id}/carrier/quote`, method: 'POST', body: { shipmentId } }),
    }),

    submitWfsCarrier: builder.mutation<InboundShipment, { id: string; carriers: WfsCarrierEntry[] }>({
      query: ({ id, ...body }) => ({ url: `/inventory/shipments/${id}/carrier`, method: 'POST', body }),
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
  useUpdateShipmentShipFromMutation,
  useGetShipRequirementsMutation,
  useSubmitInboundPlanMutation,
  useGetPackingPlanMutation,
  useSubmitPackingMutation,
  useGetShipmentOptionsMutation,
  useConfirmShipmentOptionsMutation,
  useSubmitShipmentCarrierMutation,
  useRewindShipmentMutation,
  useGenerateShipmentLabelsMutation,
  useDownloadShipmentLabelsMutation,
  useSubmitWfsCartonsMutation,
  useQuoteWfsCarrierMutation,
  useSubmitWfsCarrierMutation,
  useSyncShipmentsMutation,
} = inboundShipmentsApi
