/**
 * Inbound Shipment domain model
 *
 * An inbound shipment is OUR record first: it gets an internal ID the moment it
 * is created and only becomes known to Amazon once we call createInboundPlan
 * (SP-API Fulfillment Inbound v2024-03-20). Units in an open shipment are
 * committed against the product's FBA reserved pool; physical stock is only
 * deducted when the shipment is marked as shipped.
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
  | 'placement_confirmed' //  generate/confirmPlacementOption
  | 'window_confirmed' //     generate/confirmDeliveryWindowOptions
  | 'transport_confirmed' //  generate/confirmTransportationOptions
  | 'labels_ready' //         getLabels (v0) + createMarketplaceItemLabels

export type LabelType = 'box' | 'pallet' | 'unit'

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

/**
 * A placement option can split one inbound plan into several Amazon shipments,
 * each with its own FBA shipment ID and destination FC.
 */
export interface AmazonShipmentLeg {
  amazonShipmentId?: string
  fulfillmentCenter: string
  fcLocation?: string
  units: number
}

export interface DeliveryWindow {
  start: string
  end: string
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

/** A product's FBA reserved pool, i.e. units allocated to FBA in the Planner. */
export interface ReservedPoolItem {
  productId: string
  sku: string
  fnsku?: string
  asin: string
  title: string
  imageUrl?: string
  marketplace: Marketplace
  /** Units allocated to FBA that have not physically shipped yet. */
  reserved: number
}

/** Generic Amazon option (placement / delivery window / transportation). */
export interface AmazonOption {
  id: string
  title: string
  description?: string
  fee?: number
  tag?: string
  legs?: AmazonShipmentLeg[]
  window?: DeliveryWindow
  carrier?: string
}
