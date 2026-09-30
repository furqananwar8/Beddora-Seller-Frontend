import { StockBucket } from '@/services/api/inventoryPlanner.api'
import { BucketBalances } from '@/services/api/inventoryPlanner.api'

/**
 * Instant feedback while typing. Mirrors the backend's adjustment-planner (same
 * order of reductions); the backend stays the source of truth when saving.
 */
const REDUCTION_ORDER: StockBucket[] = ['UNALLOCATED', 'FBM', 'FBA_POOL', 'BUFFER']
const INCREASE_BUCKET: StockBucket = 'UNALLOCATED'

export const totalOf = (balances: BucketBalances): number => Object.values(balances).reduce((sum, qty) => sum + qty, 0)

/** Balances after setting the on-hand total to `target`; assumes target >= FBA_RESERVED. */
export function previewAdjustment(current: BucketBalances, target: number): BucketBalances {
  const after = { ...current }
  const diff = target - totalOf(current)

  if (diff >= 0) {
    after[INCREASE_BUCKET] += diff
    return after
  }

  let remaining = -diff
  for (const bucket of REDUCTION_ORDER) {
    const take = Math.min(after[bucket], remaining)
    after[bucket] -= take
    remaining -= take
  }
  return after
}
