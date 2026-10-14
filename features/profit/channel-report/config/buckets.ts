import type { BucketId, ListingBucketId } from '../channelReport.types'

/** How a bucket counts toward profit. */
export interface BucketDefinition {
  id: BucketId
  /** Generic section title used when several channels are combined. */
  label: string
  /** Counted in gross profit; every bucket is counted in net profit. */
  inGrossProfit: boolean
  /** Muted line for a channel that does not report the bucket: "Temu: no commission reported". */
  notReportedText: string
  /** A count shown at the end of the section, e.g. the refund count. */
  count?: { label: string; key: 'orders' | 'units' | 'refunds' }
}

/** Breakdown order (top to bottom). */
export const BUCKETS: BucketDefinition[] = [
  { id: 'sales', label: 'Sales', inGrossProfit: true, notReportedText: 'no sales reported' },
  { id: 'promo', label: 'Promotions & discounts', inGrossProfit: true, notReportedText: 'no promotions reported' },
  { id: 'ads', label: 'Advertising', inGrossProfit: true, notReportedText: 'no advertising reported' },
  {
    id: 'refund',
    label: 'Refund cost',
    inGrossProfit: true,
    notReportedText: 'no refunds reported',
    count: { label: 'Refund count', key: 'refunds' },
  },
  { id: 'fees', label: 'Channel fees', inGrossProfit: true, notReportedText: 'no commission reported' },
  { id: 'fulfillment', label: 'Fulfillment & shipping', inGrossProfit: true, notReportedText: 'no fulfillment cost reported' },
  { id: 'tax', label: 'Tax', inGrossProfit: false, notReportedText: 'no tax reported' },
  { id: 'cogs', label: 'Cost of goods', inGrossProfit: true, notReportedText: 'no product cost set' },
  { id: 'other', label: 'Other expenses', inGrossProfit: false, notReportedText: 'nothing else reported' },
]

/** Cost buckets: every bucket except sales, in breakdown order. */
export const COST_BUCKETS = BUCKETS.filter((bucket) => bucket.id !== 'sales')

/** Buckets reported per listing, in breakdown order. */
export const LISTING_BUCKET_IDS: ListingBucketId[] = ['sales', 'promo', 'ads', 'refund', 'fees', 'fulfillment', 'cogs']

/** Breakdown sections of a product / listing row. */
export const LISTING_COST_BUCKETS = COST_BUCKETS.filter((bucket) =>
  (LISTING_BUCKET_IDS as BucketId[]).includes(bucket.id),
)

/** Buckets that make up the tile's "Fees & expenses". */
export const FEES_AND_EXPENSES_BUCKETS: BucketId[] = ['fees', 'fulfillment', 'other']
