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

/** Our server keeps a copy of each label file; this is how that copy is doing. */
export interface LabelFileStatus {
  status: 'pending' | 'ready' | 'failed'
  /** Why the labels couldn't be fetched from Amazon. */
  error?: string
  updatedAt: string
}

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
  /** GROUND_SMALL_PARCEL | FREIGHT_LTL | FREIGHT_FTL_PALLET | ... */
  shippingMode?: string
  /** AMAZON_PARTNERED_CARRIER | USE_YOUR_OWN_CARRIER */
  shippingSolution?: string
  status?: string
  /** Own carrier: tracking was sent to Amazon when the shipment was marked as shipped. */
  trackingSent?: boolean
}

/** What marking one Amazon shipment as shipped needs from the seller. */
export interface ShipLegRequirement {
  shipmentId: string
  label: string
  /** partnered: Amazon's carrier reports the pickup itself; own: Amazon needs tracking from us. */
  solution: 'partnered' | 'own'
  mode: 'parcel' | 'freight'
  carrier?: string
  boxes: { boxId: string; label: string }[]
}

/** Tracking entered for one own-carrier leg: a number per box (parcel) or BOL / freight bill numbers (freight). */
export interface ShipTrackingInput {
  shipmentId: string
  boxes?: { boxId: string; trackingId: string }[]
  billOfLadingNumber?: string
  freightBillNumbers?: string[]
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
  /** Box and FNSKU label copies on our server, fetched in the background once labels are generated. */
  labels: Partial<Record<'box' | 'unit', LabelFileStatus>>
  /** Where the shipment ships from (snapshot taken when it was created or sent to Amazon). */
  shipFrom?: ShipFromAddress
  /** Amazon's fee estimates, saved as each option was confirmed. */
  fees?: ShipmentFees
  /** Last time receiving status was pulled from Amazon. */
  syncedAt?: string
}

export interface ShipFromAddress {
  name: string
  companyName?: string
  addressLine1: string
  addressLine2?: string
  city: string
  stateOrProvinceCode?: string
  postalCode: string
  /** 2-letter country code. */
  countryCode: string
  phoneNumber: string
  email?: string
}

/** A saved entry of the ship-from address book (Settings). */
export interface SavedShipFromAddress extends ShipFromAddress {
  id: string
  label: string
  isDefault: boolean
}

export interface FeeLine {
  kind: 'packing' | 'placement' | 'transport'
  label: string
  amount: number
  currency: string
}

export interface ShipmentFees {
  lines: FeeLine[]
  /** One total per currency; different currencies are never added together. */
  totals: { currency: string; amount: number }[]
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
  currency?: string
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
  currency?: string
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
