"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CarrierEntry,
  ChannelConfig,
  OptionKind,
  RewindResponse,
  RewindTarget,
  useCancelShipmentMutation,
  useConfirmShipmentOptionsMutation,
  useRewindShipmentMutation,
  useSubmitShipmentCarrierMutation,
  useCreateShipmentMutation,
  useGenerateShipmentLabelsMutation,
  useGetPackingPlanMutation,
  useDownloadShipmentLabelsMutation,
  useGetShipmentOptionsMutation,
  useGetShipmentPoolQuery,
  useGetShipmentsConfigQuery,
  useGetShipmentsQuery,
  useMarkShipmentShippedMutation,
  useQuoteWfsCarrierMutation,
  useUpdateShipmentShipFromMutation,
  useGetShipRequirementsMutation,
  useSubmitInboundPlanMutation,
  useSubmitPackingMutation,
  useSubmitWfsCarrierMutation,
  useSubmitWfsCartonsMutation,
  useSyncShipmentsMutation,
  useUpdateShipmentItemsMutation,
} from '@/services/api/inboundShipments.api'
import {
  AmazonOption,
  CarrierQuote,
  InboundShipment,
  InboundShipmentItem,
  LabelType,
  Marketplace,
  ShipFromAddress,
  PackingPlan,
  PackingSubmission,
  ReservedPoolItem,
  ShipLegRequirement,
  ShipmentChannel,
  ShipTrackingInput,
  WfsCarrierEntry,
  WfsCartons,
} from './types'
import type { LabelFormatCatalog } from './labelFormats'
import { channelOf } from './channels'

export type { CarrierEntry, ChannelConfig, OptionKind, RewindResponse, RewindTarget }

/**
 * sandbox: the backend sends the partner's steps to its sandbox (FBA_SANDBOX, WFS_ENV)
 * live:    the backend calls the real seller account
 */
export type ShipmentsMode = 'sandbox' | 'live'

/** What the Shipments screens need from their data source. */
export interface ShipmentsController {
  /** Amazon FBA's mode, as before channels; per channel in `channels`. */
  mode: ShipmentsMode
  /** Channels the backend supports (FBA only on servers that predate channels). */
  channels: ChannelConfig[]
  /** Printable label sizes per kind; undefined until the config has loaded. */
  labelFormats?: LabelFormatCatalog
  shipments: InboundShipment[]
  /** The FBA pool, as before channels. */
  pool: ReservedPoolItem[]
  /** Each channel's pool (WFS: eligibility as on Walmart.US; the create drawer asks per marketplace). */
  pools: Record<ShipmentChannel, ReservedPoolItem[]>
  lastSyncedAt: string
  /** deferListRefresh keeps the new draft out of the list until the caller's next call refreshes it. */
  createShipment: (input: CreateShipmentInput, options?: { deferListRefresh?: boolean }) => Promise<InboundShipment>
  saveItems: (id: string, items: InboundShipmentItem[]) => Promise<InboundShipment>
  submitPlan: (id: string) => Promise<InboundShipment>
  getPackingPlan: (id: string) => Promise<PackingPlan>
  submitPacking: (id: string, submission: PackingSubmission) => Promise<InboundShipment>
  getOptions: (shipment: InboundShipment, kind: OptionKind) => Promise<AmazonOption[]>
  confirmOptions: (id: string, kind: OptionKind, chosen: AmazonOption[]) => Promise<InboundShipment>
  submitCarrier: (id: string, carriers: CarrierEntry[]) => Promise<InboundShipment>
  /** WFS: cartons per Walmart shipment. */
  submitWfsCartons: (id: string, legs: WfsCartons[]) => Promise<InboundShipment>
  /** WFS (Walmart.US): Walmart's carrier rates for one Walmart shipment. */
  quoteWfsCarrier: (id: string, shipmentId: string) => Promise<CarrierQuote[]>
  submitWfsCarrier: (id: string, carriers: WfsCarrierEntry[]) => Promise<InboundShipment>
  /** Back: redo an earlier step (optionally with a new ship-from address). */
  rewind: (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) => Promise<RewindResponse>
  generateLabels: (id: string) => Promise<InboundShipment>
  downloadLabels: (id: string, type: LabelType, format?: string) => Promise<Blob>
  setShipFrom: (id: string, choice: ShipFromRequest) => Promise<InboundShipment>
  getShipRequirements: (id: string) => Promise<ShipLegRequirement[]>
  markShipped: (id: string, tracking?: ShipTrackingInput[]) => Promise<InboundShipment>
  cancelShipment: (id: string) => Promise<InboundShipment>
  sync: () => Promise<void>
}

/** A saved address, or a typed one (saved to the address book unless saveShipFromAddress is false). */
export interface ShipFromRequest {
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
}

export interface CreateShipmentInput {
  channel?: ShipmentChannel
  name: string
  marketplace: Marketplace
  items: InboundShipmentItem[]
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
  /** WFS: YYYY-MM-DD. */
  expectedDeliveryDate?: string
  /** WFS (Walmart.US): Inventory Transfer Service. */
  inventoryTransfer?: boolean
}

/** Server error text when there is one, so the partner's own message reaches the user. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as any)?.data
  return data?.error || data?.message || (err instanceof Error && err.message) || fallback
}

/** Runs an RTK mutation and rethrows failures as Error(serverMessage). */
async function call<T>(promise: { unwrap: () => Promise<T> }, fallback: string): Promise<T> {
  try {
    return await promise.unwrap()
  } catch (err) {
    throw new Error(apiErrorMessage(err, fallback))
  }
}

/** Lines for the API; WFS lines carry their units per case. */
const toLines = (items: InboundShipmentItem[]) =>
  items.map((i) => ({
    inventoryItemId: Number(i.productId),
    quantity: i.quantity,
    ...(i.unitsPerCase ? { unitsPerCase: i.unitsPerCase } : {}),
  }))

/** What a server without channels offers: FBA alone. */
const fbaOnly = (sandbox: boolean, labelFormats?: LabelFormatCatalog): ChannelConfig[] => [
  {
    id: 'amazon_fba',
    label: 'Amazon FBA',
    enabled: true,
    sandbox,
    marketplaces: [
      { id: 'Amazon.com', label: 'Amazon.com', country: 'US', currency: 'USD', capabilities: {} },
      { id: 'Amazon.ca', label: 'Amazon.ca', country: 'CA', currency: 'CAD', capabilities: {} },
      { id: 'Amazon.mx', label: 'Amazon.com.mx', country: 'MX', currency: 'MXN', capabilities: {} },
    ],
    labelFormats: labelFormats ?? {},
  },
]

/**
 * Shipments data + actions, backed by /inventory/shipments. Local actions move
 * stock between a channel's pool and its shipments; partner actions run the
 * channel's inbound workflow on the backend (Amazon SP-API, Walmart WFS).
 */
export const useShipments = (): ShipmentsController => {
  // Poll while the server is still fetching label files, so their status appears on its own
  const [pollMs, setPollMs] = useState(0)
  const { data: shipments = [] } = useGetShipmentsQuery(undefined, { pollingInterval: pollMs })
  useEffect(() => {
    // Labels are fetched right after they're generated, so a status that's missing counts as still preparing
    const preparing = shipments.some(
      (s) =>
        s.status === 'in_progress' &&
        s.stage === 'labels_ready' &&
        channelOf(s)
          .labels.filter((l) => l.type !== 'pallet' && (!l.appliesTo || l.appliesTo(s)))
          .some(({ type }) => {
            const status = s.labels?.[type as Exclude<LabelType, 'pallet'>]
            return !status || status.status === 'pending'
          })
    )
    setPollMs(preparing ? 3000 : 0)
  }, [shipments])
  const { data: config } = useGetShipmentsConfigQuery()
  const channels = useMemo(() => config?.channels ?? fbaOnly(!!config?.sandbox, config?.labelFormats), [config])
  const wfsEnabled = channels.some((c) => c.id === 'walmart_wfs' && c.enabled)
  const { data: pool = [] } = useGetShipmentPoolQuery()
  const { data: wfsPool = [] } = useGetShipmentPoolQuery({ channel: 'walmart_wfs' }, { skip: !wfsEnabled })
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toISOString())

  const [create] = useCreateShipmentMutation()
  const [updateItems] = useUpdateShipmentItemsMutation()
  const [cancel] = useCancelShipmentMutation()
  const [ship] = useMarkShipmentShippedMutation()
  const [shipRequirements] = useGetShipRequirementsMutation()
  const [updateShipFrom] = useUpdateShipmentShipFromMutation()
  const [submit] = useSubmitInboundPlanMutation()
  const [packingPlan] = useGetPackingPlanMutation()
  const [packing] = useSubmitPackingMutation()
  const [options] = useGetShipmentOptionsMutation()
  const [confirm] = useConfirmShipmentOptionsMutation()
  const [carrier] = useSubmitShipmentCarrierMutation()
  const [wfsCartons] = useSubmitWfsCartonsMutation()
  const [wfsQuote] = useQuoteWfsCarrierMutation()
  const [wfsCarrier] = useSubmitWfsCarrierMutation()
  const [rewindShipment] = useRewindShipmentMutation()
  const [labels] = useGenerateShipmentLabelsMutation()
  const [labelFile] = useDownloadShipmentLabelsMutation()
  const [syncAll] = useSyncShipmentsMutation()

  const partnerOf = (id: string) => {
    const shipment = shipments.find((s) => s.id === id)
    return shipment ? channelOf(shipment).partner : 'the partner'
  }

  const createShipment = useCallback(
    (input: CreateShipmentInput, options?: { deferListRefresh?: boolean }) =>
      call(
        create({
          deferListRefresh: options?.deferListRefresh,
          // FBA goes without a channel, exactly as before
          ...(input.channel && input.channel !== 'amazon_fba' ? { channel: input.channel } : {}),
          name: input.name,
          marketplace: input.marketplace,
          items: toLines(input.items),
          shipFromAddressId: input.shipFromAddressId,
          shipFromAddress: input.shipFromAddress,
          saveShipFromAddress: input.saveShipFromAddress,
          ...(input.expectedDeliveryDate ? { expectedDeliveryDate: input.expectedDeliveryDate } : {}),
          ...(input.inventoryTransfer ? { inventoryTransfer: true } : {}),
        }),
        'Could not create the shipment'
      ),
    [create]
  )

  const saveItems = useCallback(
    (id: string, items: InboundShipmentItem[]) => call(updateItems({ id, items: toLines(items) }), 'Could not save quantities'),
    [updateItems]
  )

  const submitPlan = useCallback(
    (id: string) => call(submit(id), `${partnerOf(id)} rejected the ${partnerOf(id) === 'Walmart' ? 'inbound order' : 'inbound plan'}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submit, shipments]
  )

  const getPackingPlan = useCallback((id: string) => call(packingPlan(id), 'Amazon did not return packing options'), [packingPlan])

  const submitPacking = useCallback(
    (id: string, submission: PackingSubmission) => call(packing({ id, packing: submission }), 'Amazon rejected the box contents'),
    [packing]
  )

  const getOptions = useCallback(
    (shipment: InboundShipment, kind: OptionKind): Promise<AmazonOption[]> =>
      call(options({ id: shipment.id, kind }), 'Amazon did not return any options'),
    [options]
  )

  const confirmOptions = useCallback(
    (id: string, kind: OptionKind, chosen: AmazonOption[]) =>
      call(confirm({ id, kind, optionIds: chosen.map((o) => o.id) }), 'Amazon rejected this option'),
    [confirm]
  )

  const submitCarrier = useCallback(
    (id: string, carriers: CarrierEntry[]) =>
      call(carrier({ id, carriers }), 'Could not save the carrier'),
    [carrier]
  )

  const submitWfsCartons = useCallback(
    (id: string, legs: WfsCartons[]) => call(wfsCartons({ id, legs }), 'Could not save the cartons'),
    [wfsCartons]
  )

  const quoteWfsCarrier = useCallback(
    async (id: string, shipmentId: string) => (await call(wfsQuote({ id, shipmentId }), 'Walmart did not return a quote')).quotes,
    [wfsQuote]
  )

  const submitWfsCarrier = useCallback(
    (id: string, carriers: WfsCarrierEntry[]) => call(wfsCarrier({ id, carriers }), 'Could not save the carrier'),
    [wfsCarrier]
  )

  const rewind = useCallback(
    (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) =>
      call(rewindShipment({ id, to, ...shipFrom }), 'Could not go back to that step'),
    [rewindShipment]
  )

  const generateLabels = useCallback((id: string) => call(labels(id), 'Could not generate labels'), [labels])

  const downloadLabels = useCallback(
    (id: string, type: LabelType, format?: string) => call(labelFile({ id, type, format }), 'Could not download the labels'),
    [labelFile]
  )

  const setShipFrom = useCallback(
    (id: string, choice: ShipFromRequest) => call(updateShipFrom({ id, ...choice }), 'Could not change the ship-from address'),
    [updateShipFrom]
  )

  const getShipRequirements = useCallback(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (id: string) => (await call(shipRequirements(id), `Could not check the shipment with ${partnerOf(id)}`)).legs,
    [shipRequirements, shipments]
  )

  const markShipped = useCallback(
    (id: string, tracking?: ShipTrackingInput[]) => call(ship({ id, tracking }), 'Could not mark as shipped'),
    [ship]
  )

  const cancelShipment = useCallback((id: string) => call(cancel(id), 'Could not cancel the shipment'), [cancel])

  const sync = useCallback(async () => {
    await call(syncAll(), 'Sync failed')
    setLastSyncedAt(new Date().toISOString())
  }, [syncAll])

  // Every channel's label kinds in one catalog (the kinds don't overlap)
  const labelFormats = useMemo<LabelFormatCatalog | undefined>(
    () => (config ? Object.assign({}, config.labelFormats, ...channels.map((c) => c.labelFormats)) : undefined),
    [config, channels]
  )

  const pools = useMemo(() => ({ amazon_fba: pool, walmart_wfs: wfsPool }), [pool, wfsPool])

  return {
    shipments,
    pool,
    pools,
    channels,
    mode: config?.sandbox ? 'sandbox' : 'live',
    labelFormats,
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getPackingPlan,
    submitPacking,
    getOptions,
    confirmOptions,
    submitCarrier,
    submitWfsCartons,
    quoteWfsCarrier,
    submitWfsCarrier,
    rewind,
    generateLabels,
    downloadLabels,
    markShipped,
    setShipFrom,
    getShipRequirements,
    cancelShipment,
    sync,
  }
}
