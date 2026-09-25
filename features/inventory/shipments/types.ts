/**
 * Inbound Shipment domain model
 *
 * An inbound shipment is OUR record first: it gets an internal ID the moment it
 * is created and only becomes known to Amazon once we call createInboundPlan
 * (SP-API Fulfillment Inbound v2024-03-20). Units in an open shipment are held
 * in the FBA_RESERVED stock bucket; physical stock is only deducted when the
 * shipment is marked as shipped.
 */

export type Marketplace = 'Amazon.com' | 'Amazon.ca' | 'Amazon.mx'

/** Lifecycle status. Only `in_progress` is editable on our side. */
export type ShipmentStatus =
  | 'in_progress'
  | 'shipped'
  | 'receiving'
  | 'closed'
  | 'cancelled'

/**
 * Progress through the Amazon inbound workflow while `in_progress`.
 * Each stage is the LAST completed step.
 */
export type ShipmentStage =
  | 'draft' //                internal only, nothing sent to Amazon
  | 'plan_created' //         createInboundPlan
  | 'packing_set' //          confirmPackingOption + setPackingInformation (box contents)
  | 'placement_confirmed' //  generate/confirmPlacementOption
  | 'window_confirmed' //     generate/confirmDeliveryWindowOptions
  | 'transport_confirmed' //  generate/confirmTransportationOptions
  | 'labels_ready' //         box labels (v0 getLabels) verified

export type LabelType = 'box' | 'pallet' | 'unit'

export type DimensionUnit = 'IN' | 'CM'
export type WeightUnit = 'LB' | 'KG'

/** How a SKU ships in cartons. Seller-provided and saved per SKU; Amazon has no API for it. */
export interface CasePack {
  unitsPerBox: number
  length: number
  width: number
  height: number
  dimensionUnit: DimensionUnit
  weight: number
  weightUnit: WeightUnit
}

export interface InboundShipmentItem {
  productId: string
  sku: string
  fnsku?: string
  asin: string
  title: string
  imageUrl?: string
  quantity: number
  /** Populated from Amazon once the shipment is receiving. */
  quantityReceived?: number
}

export interface DeliveryWindow {
  start: string
  end: string
}

/**
 * A placement option can split one inbound plan into several Amazon shipments,
 * each with its own FBA shipment ID, destination FC, window and carrier.
 */
export interface AmazonShipmentLeg {
  amazonShipmentId?: string
  /** FBA15... ID printed on labels. */
  shipmentConfirmationId?: string
  fulfillmentCenter: string
  fcLocation?: string
  units: number
  boxes?: number
  deliveryWindow?: DeliveryWindow
  carrier?: string
  status?: string
}

export interface InboundShipment {
  id: string
  /** Human-facing internal reference, e.g. SHP-0042. */
  reference: string
  name: string
  marketplace: Marketplace
  status: ShipmentStatus
  stage: ShipmentStage
  items: InboundShipmentItem[]
  amazonInboundPlanId?: string
  legs: AmazonShipmentLeg[]
  deliveryWindow?: DeliveryWindow
  carrier?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
}

/**
 * A product's FBA stock that hasn't shipped: units allocated to FBA in the
 * Planner, shared by every marketplace.
 */
export interface ReservedPoolItem {
  productId: string
  sku: string
  fnsku?: string
  asin: string
  title: string
  imageUrl?: string
  /** Units allocated to FBA that have not physically shipped yet. */
  reserved: number
  casePack?: CasePack
}

/**
 * Generic Amazon option (placement / delivery window / transportation). Window
 * and transport options belong to one Amazon shipment (`shipmentId`); the
 * picker asks for one choice per shipment.
 */
export interface AmazonOption {
  id: string
  title: string
  description?: string
  fee?: number
  tag?: string
  legs?: AmazonShipmentLeg[]
  window?: DeliveryWindow
  carrier?: string
  shipmentId?: string
  shipmentLabel?: string
}

// ── Packing (box contents)

export interface PackingGroupItem {
  productId: string
  sku: string
  title: string
  quantity: number
  casePack?: CasePack
}

export interface PackingGroup {
  packingGroupId: string
  items: PackingGroupItem[]
}

export interface PackingOption {
  packingOptionId: string
  title: string
  description?: string
  fee?: number
  groups: PackingGroup[]
}

export interface PackingPlan {
  options: PackingOption[]
}

export interface BoxSpec {
  /** Number of identical boxes packed this way. */
  count: number
  length: number
  width: number
  height: number
  dimensionUnit: DimensionUnit
  weight: number
  weightUnit: WeightUnit
  /** Units per box, per SKU. */
  items: { sku: string; quantity: number }[]
}

export interface PackingSubmission {
  packingOptionId: string
  /** Save single-SKU box specs as those SKUs' case packs. */
  saveCasePacks: boolean
  groups: { packingGroupId: string; boxes: BoxSpec[] }[]
}
