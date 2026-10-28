/**
 * Inbound Shipment domain model
 *
 * An inbound shipment is OUR record first: it gets an internal ID the moment it
 * is created and only becomes known to its partner once it is sent: Amazon FBA
 * (createInboundPlan, SP-API Fulfillment Inbound v2024-03-20) or Walmart WFS
 * (an inbound order). Units in an open shipment are held in the channel's
 * reserved stock bucket (FBA_RESERVED / WFS_RESERVED); physical stock is only
 * deducted when the shipment is marked as shipped.
 */

/** The fulfillment network a shipment goes to; fixed when the shipment is created. */
export type ShipmentChannel = 'amazon_fba' | 'walmart_wfs'

export type AmazonMarketplace = 'Amazon.com' | 'Amazon.ca' | 'Amazon.mx'
export type WalmartMarketplace = 'Walmart.US' | 'Walmart.CA'
export type Marketplace = AmazonMarketplace | WalmartMarketplace

/** Lifecycle status. Only `in_progress` is editable on our side. */
export type ShipmentStatus =
  | 'in_progress'
  | 'shipped'
  | 'receiving'
  | 'closed'
  | 'cancelled'

/**
 * Progress through the partner's inbound workflow while `in_progress`.
 * Each stage is the LAST completed step. FBA uses them all; WFS skips
 * placement_confirmed and window_confirmed (Walmart assigns the FCs and takes
 * the delivery date with the order).
 */
export type ShipmentStage =
  | 'draft' //                internal only, nothing sent to Amazon
  | 'plan_created' //         createInboundPlan
  | 'packing_set' //          confirmPackingOption + setPackingInformation (box contents)
  | 'placement_confirmed' //  generate/confirmPlacementOption
  | 'window_confirmed' //     generate/confirmDeliveryWindowOptions
  | 'transport_confirmed' //  generate/confirmTransportationOptions
  | 'labels_ready' //         box labels (v0 getLabels) verified

/** box / pallet / unit: Amazon. carton (per Walmart shipment) / carrier (Walmart-carrier bookings): Walmart. */
export type LabelType = 'box' | 'pallet' | 'unit' | 'carton' | 'carrier'

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
  /** WFS: identifiers from the marketplace's Walmart listing. */
  gtin?: string
  walmartItemId?: string
  /** WFS: sellable units per case; WFS lines are booked in whole cases. */
  unitsPerCase?: number
  title: string
  imageUrl?: string
  quantity: number
  /** Populated from the partner once the shipment is receiving. */
  quantityReceived?: number
  /** WFS: units Walmart's FC received damaged. */
  quantityDamaged?: number
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
  /** The partner's shipment id, for every channel (Amazon shipmentId, Walmart shipmentId). */
  id?: string
  amazonShipmentId?: string
  /** FBA15... ID printed on labels. */
  shipmentConfirmationId?: string
  fulfillmentCenter: string
  fcLocation?: string
  units: number
  boxes?: number
  deliveryWindow?: DeliveryWindow
  carrier?: string
  /** The vendor partner the leg was booked with; `carrier` is its name. */
  carrierPartnerId?: number
  /** YYYY-MM-DD; our own record (Amazon only gets it as ready-to-ship, the first time). */
  pickupDate?: string
  /** YYYY-MM-DD; our own record only. */
  deliveryDate?: string
  /** Our own record only; never sent to Amazon. */
  amazonAppointmentId?: string
  /** GROUND_SMALL_PARCEL | FREIGHT_LTL | FREIGHT_FTL_PALLET | ... */
  shippingMode?: string
  /** AMAZON_PARTNERED_CARRIER | USE_YOUR_OWN_CARRIER */
  shippingSolution?: string
  status?: string
  /** Own carrier: tracking was sent to the partner when the shipment was marked as shipped. */
  trackingSent?: boolean
  // ── Walmart WFS legs
  /** Walmart's shipment id. */
  shipmentId?: string
  destinationAddress?: { addressLine1?: string; city?: string; stateCode?: string; postalCode?: string; countryCode?: string }
  items?: { sku: string; quantity: number }[]
  /** Walmart's expected delivery (can differ from the date asked for). */
  expectedDeliveryDate?: string
  carrierMode?: 'own' | 'walmart'
  /** The Walmart carrier quote this leg was booked with. */
  quote?: { quoteId: string; carrierName?: string; amount?: number; currency?: string; booked: boolean }
}

/** Any channel's leg. */
export type ShipmentLeg = AmazonShipmentLeg

/** The partner's id of a leg, whatever the channel. */
export const legId = (l: ShipmentLeg) => l.id ?? l.amazonShipmentId ?? l.shipmentId ?? ''

/** What marking one Amazon shipment as shipped needs from the seller. */
export interface ShipLegRequirement {
  shipmentId: string
  label: string
  /** partnered: Amazon's carrier reports the pickup itself; own: Amazon needs tracking from us. */
  solution: 'partnered' | 'own'
  mode: 'parcel' | 'freight'
  carrier?: string
  boxes: { boxId: string; label: string }[]
  /** 'numbers': the partner takes a list of tracking numbers for the whole shipment (Walmart), not one per box. */
  tracking?: 'numbers'
}

/** Tracking entered for one own-carrier leg: a number per box (parcel) or BOL / freight bill numbers (freight). */
export interface ShipTrackingInput {
  shipmentId: string
  boxes?: { boxId: string; trackingId: string }[]
  billOfLadingNumber?: string
  freightBillNumbers?: string[]
  /** Walmart: tracking numbers for the whole shipment. */
  trackingNumbers?: string[]
}

export interface InboundShipment {
  id: string
  /** Human-facing internal reference, e.g. SHP-0042. */
  reference: string
  name: string
  /** Missing only from servers that predate channels; treat as amazon_fba. */
  channel?: ShipmentChannel
  marketplace: Marketplace
  status: ShipmentStatus
  stage: ShipmentStage
  items: InboundShipmentItem[]
  amazonInboundPlanId?: string
  /** The plan / order id on the partner's side (Amazon inbound plan, Walmart inbound order). */
  externalRef?: string
  legs: ShipmentLeg[]
  deliveryWindow?: DeliveryWindow
  carrier?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  /** Label copies on our server, fetched in the background once labels are generated. */
  labels: Partial<Record<Exclude<LabelType, 'pallet'>, LabelFileStatus>>
  /** Where the shipment ships from (snapshot taken when it was created or sent to Amazon). */
  shipFrom?: ShipFromAddress
  /** Amazon's fee estimates, saved as each option was confirmed. */
  fees?: ShipmentFees
  /** Last time receiving status was pulled from the partner. */
  syncedAt?: string
  /** WFS inputs and Walmart's answers. */
  wfs?: {
    expectedDeliveryDate?: string
    inventoryTransfer?: boolean
    /** Walmart's latest rejections of the inbound order. */
    errors?: { code?: string; field?: string; description: string }[]
  }
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
  kind: 'packing' | 'placement' | 'transport' | 'carrier'
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
 * A product's stock for one channel that hasn't shipped: units allocated to FBA
 * (or WFS) in the Planner, shared by every marketplace of that channel.
 */
export interface ReservedPoolItem {
  productId: string
  sku: string
  fnsku?: string
  asin: string
  title: string
  imageUrl?: string
  /** Units allocated to the channel that have not physically shipped yet. */
  reserved: number
  casePack?: CasePack
  /** Saved units per case, even without carton dimensions. */
  unitsPerCase?: number
  /** WFS: identifiers from the marketplace's Walmart listing, and why it can't be booked. */
  gtin?: string
  walmartItemId?: string
  eligible?: boolean
  blockReason?: string
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

// ── WFS cartons and carrier

/** Cartons for one Walmart shipment: label counts by load type, plus sizes (inches, pounds) for Walmart's carrier quote. */
export interface WfsCartons {
  shipmentId: string
  singleSku: number
  mixedSku: number
  pallet: number
  packages?: { count: number; length: number; width: number; height: number; weight: number }[]
}

export interface WfsCarrierEntry {
  shipmentId: string
  mode: 'own' | 'walmart'
  /** Own carrier: its name. */
  carrier?: string
  /** Walmart carrier: the quote to book. */
  quoteId?: string
}

export interface CarrierQuote {
  quoteId: string
  carrierName?: string
  amount?: number
  currency?: string
  estimatedDelivery?: string
}
