"use client"

import { useCallback, useState } from 'react'
import {
  AmazonOption,
  InboundShipment,
  InboundShipmentItem,
  Marketplace,
  ReservedPoolItem,
} from './types'
import {
  buildDeliveryWindowOptions,
  buildPlacementOptions,
  buildTransportationOptions,
  mockReservedPool,
  mockShipments,
} from './mockShipments'

export type OptionKind = 'placement' | 'window' | 'transport'

export interface CreateShipmentInput {
  name: string
  marketplace: Marketplace
  items: InboundShipmentItem[]
}

/**
 * Shipments data + actions.
 *
 * Integration seam: this hook is backed by local mock state today. When the
 * backend lands, replace each action body with the matching RTK mutation
 * (tag 'InboundShipments'; markShipped also invalidates 'Inventory') and the
 * state with query results. The screen and components don't need to change.
 *
 *   createShipment   POST  /inventory/shipments
 *   saveItems        PATCH /inventory/shipments/:id/items
 *   submitPlan       POST  /inventory/shipments/:id/inbound-plan        (createInboundPlan)
 *   getOptions       POST  /inventory/shipments/:id/{kind}-options      (generate*Options)
 *   confirmOption    POST  /inventory/shipments/:id/{kind}              (confirm*Option)
 *   generateLabels   POST  /inventory/shipments/:id/labels              (getLabels + createMarketplaceItemLabels)
 *   markShipped      POST  /inventory/shipments/:id/ship                (deducts on-hand stock)
 *   cancelShipment   POST  /inventory/shipments/:id/cancel              (cancelInboundPlan)
 *   sync             POST  /inventory/shipments/sync                    (pull status + received qty)
 */

const LATENCY_MS = 700
const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS))
const now = () => new Date().toISOString()

export const useShipments = () => {
  const [shipments, setShipments] = useState<InboundShipment[]>(mockShipments)
  const [pool, setPool] = useState<ReservedPoolItem[]>(mockReservedPool)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => now())

  const patch = useCallback((id: string, fn: (s: InboundShipment) => Partial<InboundShipment>) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...fn(s), updatedAt: now() } : s))
    )
  }, [])

  const createShipment = useCallback(async (input: CreateShipmentInput) => {
    await wait()
    // Backend owns the sequence; this mirrors the format.
    const nextNo =
      Math.max(0, ...shipments.map((s) => Number(s.reference.replace(/\D/g, '')) || 0)) + 1
    const padded = String(nextNo).padStart(4, '0')
    const created: InboundShipment = {
      id: `shp_${padded}`,
      reference: `SHP-${padded}`,
      name: input.name,
      marketplace: input.marketplace,
      status: 'in_progress',
      stage: 'draft',
      items: input.items,
      legs: [],
      createdAt: now(),
      updatedAt: now(),
    }
    setShipments((prev) => [created, ...prev])
    return created
  }, [shipments])

  const saveItems = useCallback(async (id: string, items: InboundShipmentItem[]) => {
    await wait()
    // Editing after createInboundPlan regenerates the plan on the backend.
    patch(id, () => ({ items }))
  }, [patch])

  const submitPlan = useCallback(async (id: string) => {
    await wait()
    patch(id, () => ({
      stage: 'plan_created',
      amazonInboundPlanId: `wf${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}`,
    }))
  }, [patch])

  const getOptions = useCallback(
    async (shipment: InboundShipment, kind: OptionKind): Promise<AmazonOption[]> => {
      await wait()
      if (kind === 'placement') return buildPlacementOptions(shipment)
      if (kind === 'window') return buildDeliveryWindowOptions()
      return buildTransportationOptions(shipment)
    },
    []
  )

  const confirmOption = useCallback(async (id: string, kind: OptionKind, option: AmazonOption) => {
    await wait()
    if (kind === 'placement') {
      patch(id, () => ({
        stage: 'placement_confirmed',
        legs: (option.legs ?? []).map((leg) => ({
          ...leg,
          amazonShipmentId: `FBA17${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
        })),
      }))
    } else if (kind === 'window') {
      patch(id, () => ({ stage: 'window_confirmed', deliveryWindow: option.window }))
    } else {
      patch(id, () => ({ stage: 'transport_confirmed', carrier: option.carrier }))
    }
  }, [patch])

  const generateLabels = useCallback(async (id: string) => {
    await wait()
    patch(id, () => ({ stage: 'labels_ready' }))
  }, [patch])

  const markShipped = useCallback(async (id: string) => {
    await wait()
    const shipment = shipments.find((s) => s.id === id)
    if (!shipment) return
    patch(id, () => ({ status: 'shipped', shippedAt: now() }))
    // Units physically left: they are no longer part of the reserved pool.
    const qty = Object.fromEntries(shipment.items.map((i) => [i.productId, i.quantity]))
    setPool((prev) =>
      prev.map((p) =>
        qty[p.productId] ? { ...p, reserved: Math.max(0, p.reserved - qty[p.productId]) } : p
      )
    )
  }, [shipments, patch])

  const cancelShipment = useCallback(async (id: string) => {
    await wait()
    // Units return to the unassigned reserved pool automatically: only open
    // shipments count as committed.
    patch(id, () => ({ status: 'cancelled' }))
  }, [patch])

  const sync = useCallback(async () => {
    await wait()
    setLastSyncedAt(now())
  }, [])

  return {
    shipments,
    pool,
    lastSyncedAt,
    createShipment,
    saveItems,
    submitPlan,
    getOptions,
    confirmOption,
    generateLabels,
    markShipped,
    cancelShipment,
    sync,
  }
}

export type ShipmentsController = ReturnType<typeof useShipments>
