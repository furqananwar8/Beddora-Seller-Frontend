import type { RewindTarget } from '@/services/api/inboundShipments.api'
import type { InboundShipment, InboundShipmentItem, LabelType, Marketplace, ShipmentChannel, ShipmentStage } from '../types'

/**
 * Everything the Shipments screen shows differently per fulfillment network.
 * Screens ask the shipment's channel definition instead of checking the
 * channel, so a new channel is a new definition, not new branches.
 */

export interface WorkflowStep {
  key: ShipmentStage | 'shipped'
  label: string
}

export type NextAction =
  | 'submit_plan'
  | 'set_packing'
  | 'choose_placement'
  | 'choose_window'
  | 'enter_carrier'
  | 'generate_labels'
  | 'mark_shipped'

export interface NextActionDef {
  action: NextAction
  label: string
  hint: string
}

export interface LabelDef {
  type: LabelType
  label: string
  /** Only offered for some shipments (pallet labels: freight legs; carrier labels: Walmart-carrier bookings). */
  appliesTo?: (s: InboundShipment) => boolean
}

export interface ChannelCopy {
  /** "Inbound plan" / "Walmart inbound order". */
  planLabel: string
  /** Drawer title and the subtitle under it. */
  newTitle: string
  newSubtitle: string
  /** Prefix of a new shipment's default name ("FBA US · Oct 16"). */
  namePrefix: string
  /** Explainer card under the product grid for the confirm button. */
  confirmCard: string
  /** Empty pool text in the create drawer. */
  emptyPool: string
  /** Fees card heading and footnote. */
  feesTitle: string
  feesNote: string
  /** Product table subtitle while the partner has a plan that an edit rebuilds. */
  editRebuildsPlan: string
  /** Product table subtitle once quantities are locked. */
  quantitiesLocked: string
  /** Spinner text while a plan is rebuilt after an edit. */
  rebuildingPlan: string
  /** Confirm text before going back to a step that rebuilds the partner's plan. */
  rewindWarning: string
  /** Banner while the backend talks to the partner's sandbox. */
  sandboxBanner: string
}

export interface ShipmentChannelDefinition {
  id: ShipmentChannel
  /** "Amazon FBA" */
  label: string
  /** "FBA": chips, pool and reserve names. */
  program: string
  /** "Amazon": who the shipment goes to, in sentences. */
  partner: string
  /** Where the seller manages the program outside Beddora. */
  portal: string
  /** Tailwind classes of the program chip. */
  chipClassName: string
  marketplaces: Marketplace[]
  /** Steps shown in the stepper and progress dots, in order; the last is always 'shipped'. */
  steps: WorkflowStep[]
  /** Stages the channel passes through, in order (a subset of ShipmentStage). */
  stageOrder: ShipmentStage[]
  /** Index of the first step that needs input once the plan exists; earlier ones hide then. */
  firstVisibleStepAfterPlan: number
  nextAction: Partial<Record<ShipmentStage, NextActionDef>>
  /** Completed steps the seller can go back to and redo. */
  stepRewindTarget: Partial<Record<WorkflowStep['key'], RewindTarget>>
  /** Completed steps that reopen their dialog instead of redoing anything. */
  stepReopenAction: Partial<Record<WorkflowStep['key'], NextAction>>
  /** What the seller redoes when going back to each target ("box contents"). */
  rewindLabel: Partial<Record<RewindTarget, string>>
  /** Targets that only change our own record, so going back doesn't ask first. */
  instantRewinds: RewindTarget[]
  labels: LabelDef[]
  /** The product table's identifier column (FNSKU / GTIN). */
  identifier: { header: string; value: (item: InboundShipmentItem) => string | undefined }
  /** "SKU · ASIN" line under each product's title. */
  itemSubline: (item: InboundShipmentItem) => string
  copy: ChannelCopy
}
