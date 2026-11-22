'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { formatMoney, TOP_RANKS, type RankBasis, type RankedRow } from './priceAnalysisForm'

/** Card colours by rank: green, light green, yellow, orange, red. Shared with the rank dots in the table. */
export const RANK_TONE: Record<number, { card: string; pill: string; price: string; dot: string }> = {
  1: { card: 'border-emerald-400 bg-emerald-50', pill: 'bg-emerald-600 text-white', price: 'text-emerald-800', dot: 'bg-emerald-500' },
  2: { card: 'border-lime-400 bg-lime-50', pill: 'bg-lime-700 text-white', price: 'text-lime-800', dot: 'bg-lime-500' },
  3: { card: 'border-yellow-400 bg-yellow-50', pill: 'bg-yellow-600 text-white', price: 'text-yellow-800', dot: 'bg-yellow-500' },
  4: { card: 'border-orange-400 bg-orange-50', pill: 'bg-orange-600 text-white', price: 'text-orange-800', dot: 'bg-orange-500' },
  5: { card: 'border-red-400 bg-red-50', pill: 'bg-red-600 text-white', price: 'text-red-800', dot: 'bg-red-500' },
}

/** The five cheapest quotes on the chosen basis (FOB, or landed cost), re-ranked on every edit. */
export const TopSupplierCards: React.FC<{ rows: RankedRow[]; currency: string; basis: RankBasis }> = ({ rows, currency, basis }) => {
  const top = rows.filter((row) => row.rank !== null && row.rank <= TOP_RANKS).sort((a, b) => a.rank! - b.rank!)
  if (top.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-muted">
        {basis === 'LANDED' ? 'Add prices and unit CBM below to rank the suppliers by landed cost.' : 'Add suppliers and their prices below to rank them here.'}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {top.map((row) => {
        const tone = RANK_TONE[row.rank!]
        const contact = row.contactName.trim() || row.supplier.contactName
        const packaging = row.packagingOption.trim()
        return (
          <div key={row.uid} className={cn('flex min-w-0 flex-col gap-1 rounded-lg border p-4', tone.card)}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-semibold', tone.pill)}>{row.rank === 1 ? '#1 Lowest' : `#${row.rank}`}</span>
              {packaging && <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">{packaging}</span>}
            </div>
            <p className="mt-1 truncate font-semibold text-text-primary" title={row.supplier.name}>
              {row.supplier.name}
            </p>
            <p className="truncate text-xs text-text-muted">POC · {contact || '—'}</p>
            <p className={cn('mt-2 text-2xl font-bold tabular-nums', tone.price)}>{formatMoney(row.basisPrice!, currency)}</p>
            <p className="text-xs text-text-muted">{row.rank === 1 ? (basis === 'LANDED' ? 'Best landed cost' : 'Best price') : `+${row.vsLowestPercent!.toFixed(1)}% vs lowest`}</p>
            {basis === 'LANDED' && row.landed && row.price !== null && (
              <p className="border-t border-border/60 pt-1 text-[11px] text-text-muted">
                FOB {formatMoney(row.price, currency)} + freight/duty {formatMoney(row.landed.freight + row.landed.duty + row.landed.clearing, currency)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
