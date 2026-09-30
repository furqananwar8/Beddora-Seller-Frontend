import React from 'react'
import { AllocationSplit, BucketBalances } from '@/services/api/inventoryPlanner.api'
import { cn } from '@/utils/cn'
import { onHand, splitFromBalances, unassigned } from './allocationMath'

export const STOCK_LEGEND = [
  { key: 'reserved', label: 'FBA in shipments (locked)', swatch: 'bg-blue-800' },
  { key: 'pool', label: 'FBA pool', swatch: 'bg-blue-300' },
  { key: 'buffer', label: 'Safety buffer', swatch: 'bg-slate-300' },
  { key: 'fbm', label: 'FBM', swatch: 'bg-emerald-400' },
  { key: 'unassigned', label: 'Unassigned', swatch: 'bg-amber-300 border border-dashed border-amber-700' },
] as const

interface Segment {
  key: string
  text: string
  units: number
  className: string
}

const MIN_LABEL_PERCENT = 6
const NEW_EDGE = 'border-l-2 border-dashed'

/**
 * One item's stock as proportional segments. Units newly taken from
 * unassigned stock show as dashed "+N new" slices next to the existing ones.
 */
export const StockBar: React.FC<{ balances: BucketBalances; split: AllocationSplit }> = ({ balances, split }) => {
  const base = splitFromBalances(balances)
  const left = unassigned(balances, split)
  const over = Math.max(0, -left)
  const scale = onHand(balances) + over || 1

  const pool = Math.max(0, split.fba - balances.FBA_RESERVED)
  const newFba = Math.max(0, split.fba - base.fba)
  const newFbm = Math.max(0, split.fbm - base.fbm)

  const segments: Segment[] = [
    { key: 'reserved', text: '', units: balances.FBA_RESERVED, className: 'bg-blue-800 text-white' },
    { key: 'pool', text: 'FBA', units: pool - Math.min(pool, newFba), className: 'bg-blue-300 text-blue-950' },
    { key: 'pool-new', text: 'new', units: Math.min(pool, newFba), className: cn('bg-blue-300 text-blue-950 border-blue-900', NEW_EDGE) },
    { key: 'buffer', text: '', units: split.buffer, className: 'bg-slate-300 text-slate-800' },
    { key: 'fbm', text: 'FBM', units: split.fbm - Math.min(split.fbm, newFbm), className: 'bg-emerald-400 text-emerald-950' },
    { key: 'fbm-new', text: 'new', units: Math.min(split.fbm, newFbm), className: cn('bg-emerald-400 text-emerald-950 border-emerald-900', NEW_EDGE) },
    left > 0
      ? { key: 'unassigned', text: 'Unassigned', units: left, className: cn('bg-amber-100 text-amber-900 border-amber-700', NEW_EDGE) }
      : { key: 'over', text: '', units: over, className: 'bg-red-700 text-white' },
  ]

  const label = (s: Segment) => {
    if (s.key === 'over') return `+${s.units.toLocaleString()}`
    if (s.text === 'new') return `+${s.units.toLocaleString()} new`
    return s.text ? `${s.text} ${s.units.toLocaleString()}` : s.units.toLocaleString()
  }

  return (
    <div
      className={cn('flex h-[30px] w-full overflow-hidden !rounded-lg border', over > 0 ? 'border-2 border-red-700' : 'border-slate-200')}
      role="img"
      aria-label={`FBA ${split.fba}, buffer ${split.buffer}, FBM ${split.fbm}, ${left >= 0 ? `${left} unassigned` : `${over} over`}`}
    >
      {segments
        .filter((s) => s.units > 0)
        .map((s) => {
          const percent = (s.units / scale) * 100
          return (
            <div
              key={s.key}
              style={{ width: `${percent}%` }}
              className={cn('flex items-center justify-center text-xs whitespace-nowrap overflow-hidden', s.className)}
            >
              {percent >= MIN_LABEL_PERCENT && label(s)}
            </div>
          )
        })}
    </div>
  )
}
