"use client"

import { useCallback, useEffect, useState } from 'react'
import {
  CarrierEntry,
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
  useUpdateShipmentShipFromMutation,
  useGetShipRequirementsMutation,
  useSubmitInboundPlanMutation,
  useSubmitPackingMutation,
  useSyncShipmentsMutation,
  useUpdateShipmentItemsMutation,
} from '@/services/api/inboundShipments.api'
import {
  AmazonOption,
  InboundShipment,
  InboundShipmentItem,
  LabelType,
  Marketplace,
  ShipFromAddress,
  PackingPlan,
  PackingSubmission,
  ReservedPoolItem,
  ShipLegRequirement,
  ShipTrackingInput,
} from './types'

export type { CarrierEntry, OptionKind, RewindResponse, RewindTarget }

/**
 * sandbox: the backend sends the Amazon steps to the SP-API sandbox (FBA_SANDBOX)
 * live:    the backend calls the real seller account
 */
export type ShipmentsMode = 'sandbox' | 'live'

/** What the Shipments screens need from their data source. */
export interface ShipmentsController {
  mode: ShipmentsMode
  shipments: InboundShipment[]
  pool: ReservedPoolItem[]
  lastSyncedAt: string
  createShipment: (input: CreateShipmentInput) => Promise<InboundShipment>
  saveItems: (id: string, items: InboundShipmentItem[]) => Promise<InboundShipment>
  submitPlan: (id: string) => Promise<InboundShipment>
  getPackingPlan: (id: string) => Promise<PackingPlan>
  submitPacking: (id: string, submission: PackingSubmission) => Promise<InboundShipment>
  getOptions: (shipment: InboundShipment, kind: OptionKind) => Promise<AmazonOption[]>
  confirmOptions: (id: string, kind: OptionKind, chosen: AmazonOption[]) => Promise<InboundShipment>
  submitCarrier: (id: string, carriers: CarrierEntry[]) => Promise<InboundShipment>
  /** Back: redo an earlier step (optionally with a new ship-from address). */
  rewind: (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) => Promise<RewindResponse>
  generateLabels: (id: string) => Promise<InboundShipment>
  downloadLabels: (id: string, type: LabelType) => Promise<Blob>
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
  name: string
  marketplace: Marketplace
  items: InboundShipmentItem[]
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
}

/** Server error text when there is one, so Amazon's own message reaches the user. */
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

const toLines = (items: InboundShipmentItem[]) =>
  items.map((i) => ({ inventoryItemId: Number(i.productId), quantity: i.quantity }))

/**
 * Shipments data + actions, backed by /inventory/shipments. Local actions move
 * stock between the FBA pool and shipments; Amazon actions run the SP-API
 * inbound workflow on the backend.
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
        (['box', 'unit'] as const).some((t) => !s.labels?.[t] || s.labels[t]?.status === 'pending')
    )
    setPollMs(preparing ? 3000 : 0)
  }, [shipments])
  const { data: pool = [] } = useGetShipmentPoolQuery()
  const { data: config } = useGetShipmentsConfigQuery()
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
  const [rewindShipment] = useRewindShipmentMutation()
  const [labels] = useGenerateShipmentLabelsMutation()
  const [labelFile] = useDownloadShipmentLabelsMutation()
  const [syncAll] = useSyncShipmentsMutation()

  const createShipment = useCallback(
    (input: CreateShipmentInput) =>
      call(
        create({
          name: input.name,
          marketplace: input.marketplace,
          items: toLines(input.items),
          shipFromAddressId: input.shipFromAddressId,
          shipFromAddress: input.shipFromAddress,
          saveShipFromAddress: input.saveShipFromAddress,
        }),
        'Could not create the shipment'
      ),
    [create]
  )

  const saveItems = useCallback(
    (id: string, items: InboundShipmentItem[]) => call(updateItems({ id, items: toLines(items) }), 'Could not save quantities'),
    [updateItems]
  )

  const submitPlan = useCallback((id: string) => call(submit(id), 'Amazon rejected the inbound plan'), [submit])

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
    (id: string, carriers: CarrierEntry[]) => call(carrier({ id, carriers }), 'Could not save the carrier'),
    [carrier]
  )

  const rewind = useCallback(
    (id: string, to: RewindTarget, shipFrom?: ShipFromRequest) =>
      call(rewindShipment({ id, to, ...shipFrom }), 'Could not go back to that step'),
    [rewindShipment]
  )

  const generateLabels = useCallback((id: string) => call(labels(id), 'Could not generate labels'), [labels])

  const downloadLabels = useCallback(
    (id: string, type: LabelType) => call(labelFile({ id, type }), 'Could not download the labels'),
    [labelFile]
  )

  const setShipFrom = useCallback(
    (id: string, choice: ShipFromRequest) => call(updateShipFrom({ id, ...choice }), 'Could not change the ship-from address'),
    [updateShipFrom]
  )

  const getShipRequirements = useCallback(
    async (id: string) => (await call(shipRequirements(id), 'Could not check the shipment with Amazon')).legs,
    [shipRequirements]
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

  return {
    shipments,
    pool,
    mode: config?.sandbox ? 'sandbox' : 'live',
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getPackingPlan,
    submitPacking,
    getOptions,
    confirmOptions,
    submitCarrier,
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

