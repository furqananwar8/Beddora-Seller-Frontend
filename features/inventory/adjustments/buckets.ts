import { BucketBalances, StockBucket } from '@/services/api/inventoryPlanner.api'

export const BUCKET_ROWS: { bucket: StockBucket; label: string }[] = [
  { bucket: 'UNALLOCATED', label: 'Unallocated' },
  { bucket: 'FBM', label: 'FBM' },
  { bucket: 'FBA_POOL', label: 'FBA (not on a shipment)' },
  { bucket: 'FBA_RESERVED', label: 'Amazon allocated (on shipments)' },
  { bucket: 'BUFFER', label: 'Safety buffer' },
]

/** The buckets the planner knows plus damaged stock, which the API also counts in a SKU's on-hand. */
export type AdjustmentBucket = StockBucket | 'DAMAGED'

/** Units in one bucket of a row (the API sends DAMAGED too). */
export const balanceOf = (balances: BucketBalances, bucket: AdjustmentBucket): number => (balances as Record<string, number>)[bucket] ?? 0

/**
 * Every bucket that makes up a SKU's on-hand, so the Adjustments table and edit screen always add up to it. `short` heads
 * the table column. (Stock Count keeps its own, shorter list above.)
 */
export const ADJUSTMENT_ROWS: { bucket: AdjustmentBucket; label: string; short: string }[] = [
  { bucket: 'UNALLOCATED', label: 'Unallocated', short: 'Unallocated' },
  { bucket: 'FBM', label: 'FBM', short: 'FBM' },
  { bucket: 'FBA_POOL', label: 'FBA (not on a shipment)', short: 'FBA' },
  { bucket: 'FBA_RESERVED', label: 'Amazon allocated (on shipments)', short: 'Amazon allocated' },
  { bucket: 'WFS_POOL', label: 'WFS (not on a shipment)', short: 'WFS' },
  { bucket: 'WFS_RESERVED', label: 'Walmart allocated (on shipments)', short: 'Walmart allocated' },
  { bucket: 'BUFFER', label: 'Safety buffer', short: 'Safety buffer' },
  { bucket: 'DAMAGED', label: 'Damaged (not adjustable here)', short: 'Damaged' },
]
