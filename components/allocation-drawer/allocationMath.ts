import { AllocationSplit, BucketBalances, PlannedMove, StockBucket } from '@/services/api/inventoryPlanner.api'

/**
 * Pure split rules for instant feedback while typing. They mirror the
 * backend's validateSplit; the movements themselves always come from the
 * backend planner (preview / save), so there is one planner, not two.
 */

export type AssignMode = 'fba' | 'wfs' | 'fbm' | 'even'

/** WFS buckets; servers that predate WFS don't send them. */
export const wfsReserved = (b: BucketBalances): number => b.WFS_RESERVED ?? 0
const wfsTotal = (b: BucketBalances): number => (b.WFS_POOL ?? 0) + wfsReserved(b)

export const onHand = (b: BucketBalances): number =>
  b.UNALLOCATED + b.FBA_POOL + b.FBA_RESERVED + wfsTotal(b) + b.BUFFER + b.FBM

export const splitFromBalances = (b: BucketBalances): AllocationSplit => ({
  fba: b.FBA_POOL + b.FBA_RESERVED,
  wfs: wfsTotal(b),
  buffer: b.BUFFER,
  fbm: b.FBM,
})

export const unassigned = (b: BucketBalances, split: AllocationSplit): number =>
  onHand(b) - split.fba - split.wfs - split.buffer - split.fbm

export const isSplitChanged = (b: BucketBalances, split: AllocationSplit): boolean => {
  const current = splitFromBalances(b)
  return current.fba !== split.fba || current.wfs !== split.wfs || current.buffer !== split.buffer || current.fbm !== split.fbm
}

/** Why this split can't be saved, or null when it can. */
export function splitError(b: BucketBalances, split: AllocationSplit): string | null {
  if (split.fba < b.FBA_RESERVED) {
    return `FBA can't go below ${b.FBA_RESERVED}. Shipments hold those units; edit or cancel them first.`
  }
  if (split.wfs < wfsReserved(b)) {
    return `WFS can't go below ${wfsReserved(b)}. Shipments hold those units; edit or cancel them first.`
  }
  const over = -unassigned(b, split)
  if (over > 0) return `That's ${over.toLocaleString()} more than on hand. Lower FBA, WFS, buffer or FBM.`
  return null
}

/** Puts every unassigned unit into FBA, WFS or FBM, or splits them evenly between FBA and FBM (odd unit goes to FBM). */
export function assignRemaining(b: BucketBalances, split: AllocationSplit, mode: AssignMode): AllocationSplit {
  const left = Math.max(0, unassigned(b, split))
  if (mode === 'fba') return { ...split, fba: split.fba + left }
  if (mode === 'wfs') return { ...split, wfs: split.wfs + left }
  if (mode === 'fbm') return { ...split, fbm: split.fbm + left }
  const toFba = Math.floor(left / 2)
  return { ...split, fba: split.fba + toFba, fbm: split.fbm + (left - toFba) }
}

/** How the slider divides the new units, in whole percent; the three always add up to 100. */
export interface SplitShares {
  fba: number
  wfs: number
  fbm: number
}

/** Where the slider starts: half FBA, half FBM, nothing to WFS until the seller drags it open. */
export const DEFAULT_SHARES: SplitShares = { fba: 50, wfs: 0, fbm: 50 }

/** New units the slider divides: unallocated stock not already put in the buffer. */
const sliderPool = (b: BucketBalances, split: AllocationSplit): number => {
  const bufferedFromNew = Math.max(0, split.buffer - splitFromBalances(b).buffer)
  return Math.max(0, b.UNALLOCATED - bufferedFromNew)
}

/**
 * Divides the new (unallocated) units between FBA, WFS and FBM by percentage, on
 * top of the current stock. Units already set aside for the buffer are left alone,
 * and rounding leftovers go to FBM so the shares always add up to every unit.
 */
export function assignByShares(b: BucketBalances, split: AllocationSplit, shares: SplitShares): AllocationSplit {
  const base = splitFromBalances(b)
  const pool = sliderPool(b, split)
  const clamp = (pct: number) => Math.min(100, Math.max(0, pct))
  const toFba = Math.round((pool * clamp(shares.fba)) / 100)
  const toWfs = Math.min(pool - toFba, Math.round((pool * clamp(shares.wfs)) / 100))
  return { ...split, fba: base.fba + toFba, wfs: base.wfs + toWfs, fbm: base.fbm + (pool - toFba - toWfs) }
}

/**
 * The shares the current split gives the new units, so the slider follows numbers
 * typed into the fields. Null when there are no new units to divide.
 */
export function sharesOf(b: BucketBalances, split: AllocationSplit): SplitShares | null {
  const pool = sliderPool(b, split)
  if (pool === 0) return null
  const base = splitFromBalances(b)
  const pct = (units: number) => Math.round((Math.max(0, units) / pool) * 100)
  const fba = Math.min(100, pct(split.fba - base.fba))
  const wfs = Math.min(100 - fba, pct(split.wfs - base.wfs))
  return { fba, wfs, fbm: 100 - fba - wfs }
}

const BUCKET_LABEL: Record<StockBucket, string> = {
  UNALLOCATED: 'unassigned',
  FBA_POOL: 'FBA',
  FBA_RESERVED: 'FBA shipments',
  WFS_POOL: 'WFS',
  WFS_RESERVED: 'WFS shipments',
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
