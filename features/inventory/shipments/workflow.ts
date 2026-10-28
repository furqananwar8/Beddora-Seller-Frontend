import type { FlagCode } from '@/components/flags/CountryFlag'
import type { RewindTarget } from '@/services/api/inboundShipments.api'
import {
  InboundShipment,
  Marketplace,
  ReservedPoolItem,
  ShipmentChannel,
  ShipmentStatus,
} from './types'
import { FBA_CHANNEL, NextAction, NextActionDef, WorkflowStep, channelIdOf, channelOf } from './channels'

/**
 * Workflow helpers shared by every channel: step position, what action
 * advances a shipment and which states allow quantity edits. Each channel's
 * steps and copy live in its definition (channels/); these read it from the
 * shipment.
 */

export type { NextAction, WorkflowStep }

/** Amazon FBA's steps, kept for callers that predate channels. */
export const WORKFLOW_STEPS: WorkflowStep[] = FBA_CHANNEL.steps
export const NEXT_ACTION = FBA_CHANNEL.nextAction as Record<InboundShipment['stage'], NextActionDef>
export const STEP_REOPEN_ACTION = FBA_CHANNEL.stepReopenAction
export const STEP_REWIND_TARGET = FBA_CHANNEL.stepRewindTarget
export const FIRST_VISIBLE_STEP_AFTER_PLAN = FBA_CHANNEL.firstVisibleStepAfterPlan

/** What advances this shipment now, or null when it isn't open (or the channel has no step there). */
export const nextActionOf = (s: InboundShipment): NextActionDef | null =>
  s.status === 'in_progress' ? channelOf(s).nextAction[s.stage] ?? null : null

/**
 * 0-based index into the channel's steps of the step currently being worked on.
 * For a cancelled shipment it's the step it was cancelled at; the steps before
 * it were completed.
 */
export const getActiveStepIndex = (s: InboundShipment): number => {
  const channel = channelOf(s)
  if (s.status !== 'in_progress' && s.status !== 'cancelled') return channel.steps.length
  return channel.stageOrder.indexOf(s.stage) + 1
}

/** "Packing", "Carrier", ...: the step a cancelled shipment stopped at. */
export const cancelledAtLabel = (s: InboundShipment) => channelOf(s).steps[getActiveStepIndex(s)]?.label

/**
 * Quantities can change until the packing step is sent. The partner can't change
 * a plan's items, so editing after the plan exists rebuilds it (FBA: a new
 * inbound plan; WFS: the order is cancelled and sent again).
 */
export const canEditItems = (s: InboundShipment) =>
  s.status === 'in_progress' && (s.stage === 'draft' || s.stage === 'plan_created')

export const isOpen = (s: InboundShipment) => s.status === 'in_progress'

/** Pallet labels only exist for freight (LTL / FTL) legs. */
export const shipsAsFreight = (s: InboundShipment) => s.legs.some((l) => l.shippingMode?.startsWith('FREIGHT'))

/** The ID printed on labels (FBA15…), falling back to the partner's shipment id. */
export const legReference = (l: { shipmentConfirmationId?: string; amazonShipmentId?: string; shipmentId?: string }) =>
  l.shipmentConfirmationId ?? l.amazonShipmentId ?? l.shipmentId

export const getShipmentUnits = (s: InboundShipment) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0)

export const getReceivedUnits = (s: InboundShipment) =>
  s.items.reduce((sum, i) => sum + (i.quantityReceived ?? 0), 0)

/** Shipments of one channel; each channel books from its own pool. */
export const ofChannel = (shipments: InboundShipment[], channel: ShipmentChannel) =>
  shipments.filter((s) => channelIdOf(s) === channel)

/**
 * Units of a product committed to open shipments, optionally excluding one
 * shipment (the one being edited, whose own qty is still available to it).
 * Pass shipments of the pool's channel only.
 */
export const getCommittedUnits = (
  shipments: InboundShipment[],
  productId: string,
  excludeShipmentId?: string
) =>
  shipments
    .filter((s) => isOpen(s) && s.id !== excludeShipmentId)
    .reduce(
      (sum, s) => sum + (s.items.find((i) => i.productId === productId)?.quantity ?? 0),
      0
    )

/** Reserved units not yet assigned to any open shipment (of the pool's channel). */
export const getUnassignedUnits = (
  pool: ReservedPoolItem[],
  shipments: InboundShipment[],
  excludeShipmentId?: string
): Record<string, number> =>
  Object.fromEntries(
    pool.map((p) => [
      p.productId,
      Math.max(0, p.reserved - getCommittedUnits(shipments, p.productId, excludeShipmentId)),
    ])
  )

export const STATUS_META: Record<
  ShipmentStatus,
  { label: string; className: string; dotClassName: string }
> = {
  in_progress: {
    label: 'In progress',
    className: 'bg-warning-50 text-warning-700 border-warning-200',
    dotClassName: 'bg-warning-500',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClassName: 'bg-blue-500',
  },
  receiving: {
    label: 'Receiving',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    dotClassName: 'bg-violet-500',
  },
  closed: {
    label: 'Closed',
    className: 'bg-success-50 text-success-700 border-success-200',
    dotClassName: 'bg-success-500',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-secondary-100 text-secondary-600 border-secondary-200',
    dotClassName: 'bg-secondary-400',
  },
}

export const MARKETPLACE_META: Record<Marketplace, { label: FlagCode; currency: string; name: string }> = {
  'Amazon.com': { label: 'US', currency: 'USD', name: 'Amazon.com' },
  'Amazon.ca': { label: 'CA', currency: 'CAD', name: 'Amazon.ca' },
  'Amazon.mx': { label: 'MX', currency: 'MXN', name: 'Amazon.mx' },
  'Walmart.US': { label: 'US', currency: 'USD', name: 'Walmart.com' },
  'Walmart.CA': { label: 'CA', currency: 'CAD', name: 'Walmart.ca' },
}
