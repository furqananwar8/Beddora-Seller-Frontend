import type { SavedShipFromAddress } from '@/features/inventory/shipments/types'

/**
 * Shipping (parcel carriers) types, mirroring the backend's API contract v1
 * (`bbeddora/docs/shipping-carriers/api-contract.md`). Keep the two in step.
 */

export type ProviderId = 'stallion' | 'shippo' | 'uniuni' | 'fedex'
export type Incoterm = 'DDP' | 'DAP' | 'DDU'
export type Handover = 'DROP_OFF' | 'PICKUP'
export type LabelFormat = 'pdf_4x6' | 'zpl_4x6' | 'pdf_letter'
export type DocumentType = 'label' | 'commercial_invoice'
export type CustomsCurrency = 'CAD' | 'USD'
export type DimensionUnit = 'CM' | 'IN'
export type WeightUnit = 'KG' | 'LB'

export type ParcelStatus =
  | 'BOOKING'
  | 'FAILED'
  | 'LABEL_CREATED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'EXCEPTION'
  | 'DELIVERED'
  | 'RETURNED'
  | 'VOID_PENDING'
  | 'VOIDED'
  | 'CARRIER_LOST'

export interface ShipAddress {
  name: string
  company?: string | null
  /** E.164, e.g. "+17165550199". */
  phone: string
  email?: string | null
  address1: string
  address2?: string | null
  city: string
  /** ISO 3166-2 suffix ("ON", "NY"). */
  province: string
  postalCode: string
  /** ISO alpha-2. */
  country: string
  residential: boolean
}

export interface ParcelPackage {
  length: number
  width: number
  height: number
  dimensionUnit: DimensionUnit
  weight: number
  weightUnit: WeightUnit
}

export interface CustomsLine {
  productId?: number | null
  sku?: string | null
  description: string
  quantity: number
  unitValue: number
  currency: CustomsCurrency
  /** Required cross-border (10 digits into the US); may be null domestically. */
  hsCode: string | null
  originCountry: string | null
  /** In the package's weight unit. */
  unitWeight?: number | null
}

export interface ShipmentRequest {
  /** A row of /inventory/addresses. */
  /** "address:5" (Settings › Addresses) or "warehouse:3" (Settings › Warehouses). */
  shipFrom: string
  to: ShipAddress
  packages: ParcelPackage[]
  /** Required (≥ 1) when the from-country differs from the to-country. */
  items: CustomsLine[]
  incoterm: Incoterm
  handover: Handover
  /** yyyy-mm-dd, required for a pickup. */
  pickupDate?: string | null
  signature: boolean
  /** CAD. */
  insuranceAmount?: number | null
  reference?: string | null
  providers?: ProviderId[]
}

/* ─────────────── Ship from ─────────────── */

/** A place to ship from: a saved address or a warehouse (which ships under the company's name and phone). */
export interface ShipFromOption extends SavedShipFromAddress {
  /** "<kind>:<id>". */
  id: string
  kind: 'address' | 'warehouse'
  /** What carriers need that the place lacks, and where to add it; such a place can't be quoted. */
  missing: string[]
}

/* ─────────────── Config & products ─────────────── */

export interface LabelFormatOption {
  id: LabelFormat
  label: string
  description: string
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  enabled: boolean
  disabledReason?: string
  sandbox: boolean
  labelFormats: LabelFormatOption[]
  capabilities: { pickup: boolean; dropOff: boolean; incoterms: Incoterm[]; commercialInvoice: boolean }
}

export interface ShippingConfig {
  providers: ProviderInfo[]
}

export interface ShippingProduct {
  id: number
  sku: string | null
  name: string
  variantName: string | null
  upc: string | null
  hasPhoto: boolean
  /** Per unit, kg. */
  weight: number | null
  weightUnit: 'KG'
  length: number | null
  width: number | null
  height: number | null
  dimensionUnit: 'CM'
  description: string | null
  /** From the last customs line booked for this SKU; null when never shipped. */
  hsCode: string | null
  originCountry: string | null
  unitValue: number | null
  currency: CustomsCurrency | null
}

/* ─────────────── Rates (SSE) ─────────────── */

export type RateTag = 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE'

export interface Rate {
  /** Opaque, unique within the quote. */
  rateId: string
  provider: ProviderId
  providerLabel: string
  carrier: string
  serviceName: string
  total: number
  currency: 'CAD'
  baseRate: number | null
  surcharges: { label: string; amount: number }[]
  taxes: number | null
  /** Included duties (DDP) when the provider quotes them. */
  duties: number | null
  /** e.g. "Billed after delivery". */
  dutiesNote: string | null
  minDays: number | null
  maxDays: number | null
  /** yyyy-mm-dd */
  estimatedDelivery: string | null
  tags: RateTag[]
}

export type ProviderStreamStatus = 'loading' | 'done' | 'error' | 'skipped'

export interface ProviderEvent {
  provider: ProviderId
  providerLabel: string
  status: ProviderStreamStatus
  count?: number
  message?: string
}

export interface UnavailableService {
  provider: ProviderId
  providerLabel: string
  service?: string
  reason: string
}

/** The events of `POST /shipping/rates`, by name. */
export interface RateStreamEvents {
  quote: { quoteId: string; expiresAt: string }
  provider: ProviderEvent
  rate: Rate
  unavailable: UnavailableService
  done: { quoteId: string; count: number }
}

/* ─────────────── Shipments ─────────────── */

export interface BookShipmentBody {
  quoteId: string
  rateId: string
  labelFormat: LabelFormat
  /** Booking a channel order: it is marked shipped on the channel afterwards. */
  order?: ChannelOrderRef
}

export interface ParcelShipmentListItem {
  id: number
  /** "SHP-000184" */
  bookingNo: string
  reference: string | null
  provider: ProviderId
  providerLabel: string
  carrier: string
  serviceName: string
  trackingNumber: string | null
  status: ParcelStatus
  /** Title Case, ready to show ("Exception - Customs Hold"). */
  statusLabel: string
  /** Voiding is offered (label not scanned yet). */
  canCancel: boolean
  /** Set while LABEL_CREATED. */
  notScannedDays: number | null
  recipient: { name: string; city: string; province: string; country: string }
  total: number
  currency: 'CAD'
  createdAt: string
}

export interface TrackingEvent {
  status: ParcelStatus
  statusLabel: string
  description: string
  location: string | null
  occurredAt: string
}

export type PriceBreakdown = Pick<Rate, 'baseRate' | 'surcharges' | 'taxes' | 'duties' | 'dutiesNote'>

export interface ParcelShipmentDto extends ParcelShipmentListItem {
  trackingUrl: string | null
  from: ShipAddress & { label: string }
  to: ShipAddress
  packages: ParcelPackage[]
  items: CustomsLine[]
  incoterm: Incoterm
  handover: Handover
  pickupDate: string | null
  signature: boolean
  insuranceAmount: number | null
  labelFormat: LabelFormat
  /** What can be downloaded. */
  documents: DocumentType[]
  priceBreakdown: PriceBreakdown
  canCancel: boolean
  createdBy: { id: number; name: string } | null
  lastEventAt: string | null
  lastCheckedAt: string | null
  lastSource: 'webhook' | 'poll' | null
  nextPollAt: string | null
  /** Newest first. */
  events: TrackingEvent[]
  /** The channel order this parcel ships, and whether it was marked shipped there. */
  channelOrder: (ChannelOrderRef & { sync: ChannelSync; syncMessage: string | null; syncedAt: string | null }) | null
}

export interface ShipmentListParams {
  page: number
  limit: number
  search?: string
  providers?: ProviderId[]
  statuses?: ParcelStatus[]
  /** yyyy-mm-dd, on createdAt. */
  from?: string
  to?: string
}

export interface ShipmentSummary {
  inTransit: number
  notScanned: number
  /** LABEL_CREATED older than 5 days. */
  notScannedStale: number
  exceptions: number
  spendThisMonth: number
  currency: 'CAD'
}

/* ─────────────── Channel orders ─────────────── */

export type ChannelId = 'walmart' | 'amazon' | 'temu'
/** Marking the order shipped on its channel after booking; SKIPPED while SHIPPING_ENV=sandbox. */
export type ChannelSync = 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED'
/** NOT_READY: the channel hasn't released the order for shipping yet (payment pending). */
export type Fulfillment = 'NOT_READY' | 'TO_BOOK' | 'BOOKED' | 'SHIPPED_ON_CHANNEL' | 'CANCELLED'

export interface ChannelOrderRef {
  channel: ChannelId
  market: string
  orderId: string
}

export interface ChannelInfo {
  id: ChannelId
  label: string
  connected: boolean
  markets: { id: string; label: string; country: string }[]
}

export interface ChannelOrderLine {
  lineNumber: string
  sku: string
  productName: string
  quantity: number
  /** What the customer paid per unit, before tax. */
  unitPrice: number | null
  currency: string | null
  /** Tax on the line's full quantity; null when the channel doesn't report it. */
  tax: number | null
  /** The channel's wording. */
  status: string
}

/** What an order's total is made of. Discounts are negative; tax is null when the channel doesn't report it. */
export interface ChannelOrderAmounts {
  items: number
  shipping: number
  discount: number
  tax: number | null
}

/** Tracking the channel itself knows (orders shipped directly on the channel). */
export interface ChannelTracking {
  carrier: string | null
  /** The carrier's service, e.g. "Intelcom Standard". */
  service?: string | null
  trackingNumber: string
  trackingUrl: string | null
  shippedAt: string | null
  /** The channel's package status, e.g. "SHIPPED"; on the order's own read, the carrier's latest status. */
  status?: string | null
  /** Carrier scans, newest first: only on the order's own read (GET one channel order). */
  events?: TrackingEvent[]
  /** The provider that read the scans. */
  trackedBy?: string | null
  /** Why there are no scans, when there are none. */
  trackingNote?: string | null
}

export interface ChannelOrderBooking {
  id: number
  bookingNo: string
  provider: ProviderId
  providerLabel: string
  carrier: string
  serviceName: string
  trackingNumber: string | null
  trackingUrl: string | null
  status: ParcelStatus
  statusLabel: string
  channelSync: ChannelSync | null
  channelSyncMessage: string | null
  /** The newest carrier scan we have stored, or null before the first one. */
  latestEvent: TrackingEvent | null
}

export interface ChannelOrderListItem extends ChannelOrderRef {
  channelLabel: string
  marketLabel: string
  customerOrderId: string | null
  orderDate: string
  /** The channel's wording, e.g. "Acknowledged". */
  channelStatus: string
  fulfillment: Fulfillment
  lines: ChannelOrderLine[]
  amounts: ChannelOrderAmounts
  total: number
  currency: string
  tracking: ChannelTracking[]
  bookingId: number | null
  booking: ChannelOrderBooking | null
}

export interface ChannelOrderListParams {
  page: number
  limit: number
  search?: string
  channels?: ChannelId[]
  /** Marketplace countries: "CA", "US", "MX". */
  countries?: string[]
  states?: Fulfillment[]
  /** yyyy-mm-dd, on the order date. */
  from?: string
  to?: string
}

export interface ChannelOrderDetailLine {
  lineNumber: string
  sku: string
  productName: string
  quantity: number
  /** Sale price per product unit on the order: the default customs value. */
  unitPrice: number | null
  currency: string | null
  /** Null when the SKU isn't mapped to one of our products. */
  product: ShippingProduct | null
  /** Product units in one ordered item (bundles); units = quantity × unitsPerItem. */
  unitsPerItem: number
}

export interface ChannelOrderDetail {
  order: ChannelOrderListItem
  shipTo: ShipAddress | null
  /** Why the ship-to address couldn't be read. */
  shipToError: string | null
  /** A bundle SKU yields several entries with the same lineNumber. */
  lines: ChannelOrderDetailLine[]
}
