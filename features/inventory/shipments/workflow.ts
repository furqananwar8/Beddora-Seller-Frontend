import {
  InboundShipment,
  Marketplace,
  ReservedPoolItem,
  ShipmentStage,
  ShipmentStatus,
} from './types'

/**
 * Single source of truth for the shipment workflow: step order, what action
 * advances each stage and which states allow quantity edits.
 */

export interface WorkflowStep {
  key: ShipmentStage | 'shipped'
  label: string
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'draft', label: 'Items' },
  { key: 'plan_created', label: 'Inbound plan' },
  { key: 'packing_set', label: 'Packing' },
  { key: 'placement_confirmed', label: 'Warehouse' },
  { key: 'window_confirmed', label: 'Delivery window' },
  { key: 'transport_confirmed', label: 'Carrier' },
  { key: 'labels_ready', label: 'Labels' },
  { key: 'shipped', label: 'Shipped' },
]

const STAGE_ORDER: ShipmentStage[] = [
  'draft',
  'plan_created',
  'packing_set',
  'placement_confirmed',
  'window_confirmed',
  'transport_confirmed',
  'labels_ready',
]

export type NextAction =
  | 'submit_plan'
  | 'set_packing'
  | 'choose_placement'
  | 'choose_window'
  | 'choose_transport'
  | 'generate_labels'
  | 'mark_shipped'

export const NEXT_ACTION: Record<ShipmentStage, { action: NextAction; label: string; hint: string }> = {
  draft: {
    action: 'submit_plan',
    label: 'Send to Amazon',
    hint: 'Internal draft. Nothing has been sent to Amazon yet.',
  },
  plan_created: {
    action: 'set_packing',
    label: 'Enter box contents',
    hint: 'Amazon accepted the inbound plan. Tell Amazon how the units are packed into boxes.',
  },
  packing_set: {
    action: 'choose_placement',
    label: 'Choose placement',
    hint: 'Box contents sent. Pick one of Amazon’s placement options; Amazon assigns the warehouses.',
  },
  placement_confirmed: {
    action: 'choose_window',
    label: 'Choose delivery window',
    hint: 'Warehouse confirmed. Request a ship date / delivery window.',
  },
  window_confirmed: {
    action: 'choose_transport',
    label: 'Choose carrier',
    hint: 'Delivery window booked. Select a carrier to book transport.',
  },
  transport_confirmed: {
    action: 'generate_labels',
    label: 'Generate labels',
    hint: 'Carrier booked. Generate pallet, box and FNSKU unit labels.',
  },
  labels_ready: {
    action: 'mark_shipped',
    label: 'Mark as shipped',
    hint: 'Labels are ready. Mark as shipped once the truck has left.',
  },
}

/** 0-based index into WORKFLOW_STEPS of the step currently being worked on. */
export const getActiveStepIndex = (s: InboundShipment): number => {
  if (s.status !== 'in_progress') return WORKFLOW_STEPS.length
  return STAGE_ORDER.indexOf(s.stage) + 1
}

/**
 * Quantities can change until box contents are sent. Amazon can't change a
 * plan's items, so editing after the plan exists cancels it and the shipment
 * goes back to Draft to be sent again.
 */
export const canEditItems = (s: InboundShipment) =>
  s.status === 'in_progress' && (s.stage === 'draft' || s.stage === 'plan_created')

export const isOpen = (s: InboundShipment) => s.status === 'in_progress'

export const getShipmentUnits = (s: InboundShipment) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0)

export const getReceivedUnits = (s: InboundShipment) =>
  s.items.reduce((sum, i) => sum + (i.quantityReceived ?? 0), 0)

/**
 * Units of a product committed to open shipments, optionally excluding one
 * shipment (the one being edited, whose own qty is still available to it).
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

/** Reserved units not yet assigned to any open shipment. */
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

export const MARKETPLACE_META: Record<Marketplace, { label: string; flag: string; currency: string }> = {
  'Amazon.com': { label: 'US', flag: '🇺🇸', currency: 'USD' },
  'Amazon.ca': { label: 'CA', flag: '🇨🇦', currency: 'CAD' },
  'Amazon.mx': { label: 'MX', flag: '🇲🇽', currency: 'MXN' },
}
