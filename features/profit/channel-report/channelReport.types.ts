/**
 * Channel Report view types.
 *
 * The backend normalises every channel into the same buckets, so nothing here knows a channel's API field names.
 * A channel adds wording only (`nativeGroup` / line labels), never new shapes.
 */

/** Sales channel id (`amazon`, `walmart`, ...). Open string: a new channel is config, not a type change. */
export type ChannelId = string

/** `business`: orders by order date (Business Report). `settlement`: financial transactions as they post (Settlement Report). */
export type ReportBasis = 'business' | 'settlement'

export type BucketId =
  | 'sales'
  | 'promo'
  | 'ads'
  | 'refund'
  | 'fees'
  | 'fulfillment'
  | 'tax'
  | 'cogs'
  | 'other'

/** One line inside a bucket, in the channel's own wording. Costs are negative. */
export interface BucketLine {
  label: string
  amount: number
}

/** A bucket as one channel reports it. */
export interface ChannelBucket {
  /** The channel's own name for the bucket, e.g. Shopify "Payment processing". */
  nativeGroup: string
  amount: number
  lines: BucketLine[]
  /** False when the channel shows this bucket for information but does not deduct it from profit. Defaults to true. */
  inProfit?: boolean
}

/** Counts toward gross / net profit. */
export const countsInProfit = (bucket: ChannelBucket | null): bucket is ChannelBucket =>
  bucket !== null && bucket.inProfit !== false

/** `null` = the channel does not report this bucket. Shown as "n/a" and left out of totals, never $0. */
export type ChannelBuckets = Record<BucketId, ChannelBucket | null>

export interface ChannelPeriodMetrics {
  channel: ChannelId
  orders: number
  units: number
  refunds: number
  buckets: ChannelBuckets
}

export interface ChannelPeriodSummary {
  /** Period key (`TODAY`, `MONTH_TO_DATE`, ...) or `CUSTOM`. */
  period: string
  /** Sales change vs. the comparable previous period, in %. */
  salesChangePct: number | null
  channels: ChannelPeriodMetrics[]
}

/** A connected sales channel and its sync state, as the API reports it. */
export interface ChannelConnection {
  channel: ChannelId
  syncLabel: string
  syncTone: 'ok' | 'warning'
}

// ──────────────────────────────
// Products / listings
// ──────────────────────────────

/** Buckets reported per listing in the products table (tax and account-level expenses are not per listing). */
export type ListingBucketId = Exclude<BucketId, 'tax' | 'other'>

export type ListingAmounts = Record<ListingBucketId, number | null>

/** A listing's buckets in the channel's own wording; `null` = not reported. */
export type ListingBuckets = Record<ListingBucketId, ChannelBucket | null>

/** A channel listing (one row of `product_listing`). `productId` is null until it is linked to a master product. */
export interface ChannelListing {
  listingId: string
  channel: ChannelId
  channelSku: string
  /** ASIN / Walmart item ID / Shopify variant / Temu goods ID. */
  channelItemId: string
  title: string
  /** Marketplace code (CA, US, MX) when the channel sells in several. */
  marketplace?: string | null
  productId: string | null
  orders: number
  units: number
  refunds: number
  buckets: ListingBuckets
}

export interface MasterProduct {
  productId: string
  title: string
  sku: string
  /** Catalog details a channel may know; products sharing a parent SKU / ASIN group under one parent row. */
  asin?: string | null
  imageUrl?: string | null
  parentSku?: string | null
  parentAsin?: string | null
}

export interface ChannelListingsResult {
  products: MasterProduct[]
  listings: ChannelListing[]
}

// ──────────────────────────────
// Query params (the API contract the data hooks take)
// ──────────────────────────────

export interface ChannelReportParams {
  channels: ChannelId[]
  marketplaces: string[]
  currency: string
  basis: ReportBasis
  /** Tile periods (summary). When absent, `startDate`–`endDate` is one custom period. */
  periods?: string[]
  startDate?: string
  endDate?: string
}
