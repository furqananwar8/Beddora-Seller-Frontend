import { AllocationSplit, BucketBalances, PlannedMove, StockBucket } from '@/services/api/inventoryPlanner.api'

/**
 * Pure split rules for instant feedback while typing. They mirror the
 * backend's validateSplit; the movements themselves always come from the
 * backend planner (preview / save), so there is one planner, not two.
 */

export type AssignMode = 'fba' | 'fbm' | 'even'

export const onHand = (b: BucketBalances): number =>
  b.UNALLOCATED + b.FBA_POOL + b.FBA_RESERVED + b.BUFFER + b.FBM

export const splitFromBalances = (b: BucketBalances): AllocationSplit => ({
  fba: b.FBA_POOL + b.FBA_RESERVED,
  buffer: b.BUFFER,
  fbm: b.FBM,
})

export const unassigned = (b: BucketBalances, split: AllocationSplit): number =>
  onHand(b) - split.fba - split.buffer - split.fbm

export const isSplitChanged = (b: BucketBalances, split: AllocationSplit): boolean => {
  const current = splitFromBalances(b)
  return current.fba !== split.fba || current.buffer !== split.buffer || current.fbm !== split.fbm
}

/** Why this split can't be saved, or null when it can. */
export function splitError(b: BucketBalances, split: AllocationSplit): string | null {
  if (split.fba < b.FBA_RESERVED) {
    return `FBA can't go below ${b.FBA_RESERVED}. Shipments hold those units; edit or cancel them first.`
  }
  const over = -unassigned(b, split)
  if (over > 0) return `That's ${over.toLocaleString()} more than on hand. Lower FBA, buffer or FBM.`
  return null
}

/** Puts every unassigned unit into FBA, FBM, or splits them evenly (odd unit goes to FBM). */
export function assignRemaining(b: BucketBalances, split: AllocationSplit, mode: AssignMode): AllocationSplit {
  const left = Math.max(0, unassigned(b, split))
  if (mode === 'fba') return { ...split, fba: split.fba + left }
  if (mode === 'fbm') return { ...split, fbm: split.fbm + left }
  const toFba = Math.floor(left / 2)
  return { ...split, fba: split.fba + toFba, fbm: split.fbm + (left - toFba) }
}

const BUCKET_LABEL: Record<StockBucket, string> = {
  UNALLOCATED: 'unassigned',
  FBA_POOL: 'FBA',
  FBA_RESERVED: 'FBA shipments',
  BUFFER: 'buffer',
  FBM: 'FBM',
}

export const bucketLabel = (bucket: StockBucket): string => BUCKET_LABEL[bucket]

const units = (n: number) => n.toLocaleString()

/** One-line summary of server-planned moves, e.g. "50 new units: 25 to FBA, 25 to FBM". */
export function describeMoves(moves: PlannedMove[]): string {
  if (moves.length === 0) return 'No stock change'

  const parts: string[] = []
  const assigned = moves.filter((m) => m.from === 'UNALLOCATED')
  if (assigned.length > 0) {
    const total = assigned.reduce((sum, m) => sum + m.quantity, 0)
    const targets = assigned.map((m) => `${units(m.quantity)} to ${BUCKET_LABEL[m.to]}`).join(', ')
    parts.push(`${units(total)} new unit${total === 1 ? '' : 's'}: ${targets}`)
  }
  for (const m of moves.filter((move) => move.from !== 'UNALLOCATED')) {
    parts.push(
      m.to === 'UNALLOCATED'
        ? `Returned ${units(m.quantity)} from ${BUCKET_LABEL[m.from]} to unassigned`
        : `Moved ${units(m.quantity)} from ${BUCKET_LABEL[m.from]} to ${BUCKET_LABEL[m.to]}`
    )
  }
  return parts.join('; ')
}

/** Parses a quantity field; blanks and invalid input count as 0, negatives are clamped. */
export const parseUnits = (raw: string): number => {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}
