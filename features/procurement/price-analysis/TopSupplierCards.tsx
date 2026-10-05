'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { formatMoney, TOP_RANKS, type RankedRow } from './priceAnalysisForm'

/** Card colours by rank: green, light green, yellow, orange, red. Shared with the rank dots in the table. */
export const RANK_TONE: Record<number, { card: string; pill: string; price: string; dot: string }> = {
  1: { card: 'border-emerald-400 bg-emerald-50', pill: 'bg-emerald-600 text-white', price: 'text-emerald-800', dot: 'bg-emerald-500' },
  2: { card: 'border-lime-400 bg-lime-50', pill: 'bg-lime-700 text-white', price: 'text-lime-800', dot: 'bg-lime-500' },
  3: { card: 'border-yellow-400 bg-yellow-50', pill: 'bg-yellow-600 text-white', price: 'text-yellow-800', dot: 'bg-yellow-500' },
  4: { card: 'border-orange-400 bg-orange-50', pill: 'bg-orange-600 text-white', price: 'text-orange-800', dot: 'bg-orange-500' },
  5: { card: 'border-red-400 bg-red-50', pill: 'bg-red-600 text-white', price: 'text-red-800', dot: 'bg-red-500' },
}

/** The five cheapest quotes, re-ranked on every price edit. */
export const TopSupplierCards: React.FC<{ rows: RankedRow[]; currency: string }> = ({ rows, currency }) => {
  const top = rows.filter((row) => row.rank !== null && row.rank <= TOP_RANKS).sort((a, b) => a.rank! - b.rank!)
  if (top.length === 0) {
    return <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-muted">Add suppliers and their prices below to rank them here.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {top.map((row) => {
        const tone = RANK_TONE[row.rank!]
        const contact = row.contactName.trim() || row.supplier.contactName
        return (
          <div key={row.supplier.id} className={cn('flex min-w-0 flex-col gap-1 rounded-lg border p-4', tone.card)}>
            <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-semibold', tone.pill)}>{row.rank === 1 ? '#1 Lowest' : `#${row.rank}`}</span>
            <p className="mt-1 truncate font-semibold text-text-primary" title={row.supplier.name}>
              {row.supplier.name}
            </p>
            <p className="truncate text-xs text-text-muted">POC · {contact || '—'}</p>
            <p className={cn('mt-2 text-2xl font-bold tabular-nums', tone.price)}>{formatMoney(row.price!, currency)}</p>
            <p className="text-xs text-text-muted">{row.rank === 1 ? 'Best price' : `+${row.vsLowestPercent!.toFixed(1)}% vs lowest`}</p>
          </div>
        )
      })}
    </div>
  )
}
