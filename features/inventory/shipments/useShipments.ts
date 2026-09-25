"use client"

import { useCallback, useState } from 'react'
import {
  OptionKind,
  useCancelShipmentMutation,
  useConfirmShipmentOptionsMutation,
  useCreateShipmentMutation,
  useGenerateShipmentLabelsMutation,
  useGetPackingPlanMutation,
  useGetShipmentLabelsMutation,
  useGetShipmentOptionsMutation,
  useGetShipmentPoolQuery,
  useGetShipmentsQuery,
  useMarkShipmentShippedMutation,
  useSubmitInboundPlanMutation,
  useSubmitPackingMutation,
  useSyncShipmentsMutation,
  useUpdateShipmentItemsMutation,
} from '@/services/api/inboundShipments.api'
import { AmazonOption, InboundShipment, InboundShipmentItem, LabelType, Marketplace, PackingSubmission } from './types'

export type { OptionKind }

export interface CreateShipmentInput {
  name: string
  marketplace: Marketplace
  items: InboundShipmentItem[]
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
export const useShipments = () => {
  const { data: shipments = [] } = useGetShipmentsQuery()
  const { data: pool = [] } = useGetShipmentPoolQuery()
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toISOString())

  const [create] = useCreateShipmentMutation()
  const [updateItems] = useUpdateShipmentItemsMutation()
  const [cancel] = useCancelShipmentMutation()
  const [ship] = useMarkShipmentShippedMutation()
  const [submit] = useSubmitInboundPlanMutation()
  const [packingPlan] = useGetPackingPlanMutation()
  const [packing] = useSubmitPackingMutation()
  const [options] = useGetShipmentOptionsMutation()
  const [confirm] = useConfirmShipmentOptionsMutation()
  const [labels] = useGenerateShipmentLabelsMutation()
  const [labelDownloads] = useGetShipmentLabelsMutation()
  const [syncAll] = useSyncShipmentsMutation()

  const createShipment = useCallback(
    (input: CreateShipmentInput) =>
      call(create({ name: input.name, marketplace: input.marketplace, items: toLines(input.items) }), 'Could not create the shipment'),
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

  const generateLabels = useCallback((id: string) => call(labels(id), 'Could not generate labels'), [labels])

  const getLabels = useCallback(
    (id: string, type: LabelType) => call(labelDownloads({ id, type }), 'Could not get labels from Amazon'),
    [labelDownloads]
  )

  const markShipped = useCallback((id: string) => call(ship(id), 'Could not mark as shipped'), [ship])

  const cancelShipment = useCallback((id: string) => call(cancel(id), 'Could not cancel the shipment'), [cancel])

  const sync = useCallback(async () => {
    await call(syncAll(), 'Sync failed')
    setLastSyncedAt(new Date().toISOString())
  }, [syncAll])

  return {
    shipments,
    pool,
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getPackingPlan,
    submitPacking,
    getOptions,
    confirmOptions,
    generateLabels,
    getLabels,
    markShipped,
    cancelShipment,
    sync,
  }
}

export type ShipmentsController = ReturnType<typeof useShipments>
