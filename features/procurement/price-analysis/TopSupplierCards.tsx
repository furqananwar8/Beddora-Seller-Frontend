'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { formatMoney, TOP_CARDS, type RankBasis, type RankedRow } from './priceAnalysisForm'

/** Card colours by rank: green, light green, yellow, orange, red. Shared with the rank dots in the table. */
export const RANK_TONE: Record<number, { card: string; pill: string; price: string; dot: string }> = {
  1: { card: 'border-emerald-400 bg-emerald-50/60', pill: 'bg-emerald-600 text-white', price: 'text-emerald-700', dot: 'bg-emerald-500' },
  2: { card: 'border-lime-400 bg-lime-50/60', pill: 'bg-lime-600 text-white', price: 'text-lime-700', dot: 'bg-lime-500' },
  3: { card: 'border-orange-300 bg-orange-50/60', pill: 'bg-orange-500 text-white', price: 'text-orange-700', dot: 'bg-orange-500' },
  4: { card: 'border-gray-300 bg-gray-50', pill: 'bg-gray-500 text-white', price: 'text-gray-700', dot: 'bg-gray-400' },
  5: { card: 'border-gray-300 bg-gray-50', pill: 'bg-gray-500 text-white', price: 'text-gray-700', dot: 'bg-gray-400' },
}

interface TopSupplierCardsProps {
  rows: RankedRow[]
  currency: string
  basis: RankBasis
  /** The selected variant as the chips write it (colour · size). */
  variantText: string
}

/** The cheapest quotes of the selected variant on the chosen basis (FOB, or landed cost), re-ranked on every edit. */
export const TopSupplierCards: React.FC<TopSupplierCardsProps> = ({ rows, currency, basis, variantText }) => {
  const top = rows.filter((row) => row.rank !== null && row.rank <= TOP_CARDS).sort((a, b) => a.rank! - b.rank!)
  if (top.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-muted">
        {basis === 'LANDED' ? 'Add prices and unit CBM below to rank the suppliers by landed cost.' : 'Add suppliers and their prices below to rank them here.'}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {top.map((row) => {
        const tone = RANK_TONE[row.rank!]
        const packaging = row.packagingOption.trim()
        return (
          <div key={row.uid} className={cn('flex min-w-0 flex-col gap-1 rounded-lg border p-4', tone.card)}>
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className={cn('w-fit rounded-md px-2 py-0.5 text-xs font-semibold', tone.pill)}>{row.rank === 1 ? '#1 Lowest' : `#${row.rank}`}</span>
              <span className="truncate rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">{[variantText, packaging].filter(Boolean).join(' · ')}</span>
            </div>
            <p className="mt-2 truncate text-base font-bold text-text-primary" title={row.supplierName}>
              {row.supplierName.trim() || 'Unnamed supplier'}
            </p>
            <p className="truncate text-xs text-text-muted">
              POC · {row.contactName.trim() || '—'}
              {row.moq.trim() ? ` · MOQ ${row.moq.trim()}` : ''}
            </p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className={cn('text-2xl font-bold tabular-nums', tone.price)}>{formatMoney(row.basisPrice!, currency)}</p>
              <p className="pb-1 text-xs font-medium text-text-secondary">{row.rank === 1 ? (basis === 'LANDED' ? 'Best Landed Cost' : 'Best price') : `+${row.vsLowestPercent!.toFixed(1)}% vs lowest`}</p>
            </div>
            {basis === 'LANDED' && row.landed && row.price !== null && (
              <p className="border-t border-border/60 pt-1 text-[11px] text-text-muted">
                FOB: {formatMoney(row.price, currency)} + Freight/Duty: {formatMoney(row.landed.freight + row.landed.duty, currency)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
