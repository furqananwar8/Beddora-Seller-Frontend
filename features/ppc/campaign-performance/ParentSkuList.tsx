'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { ParentSkuSummary } from '@/types/campaignPerformance.types'

interface ParentSkuListProps {
  parents: ParentSkuSummary[]
  selected: string | null
  search: string
  isLoading: boolean
  onSearch: (value: string) => void
  onSelect: (parentSku: string) => void
}

/** The left column: parent SKUs by spend, each with how much of its budget the spend used. */
export const ParentSkuList: React.FC<ParentSkuListProps> = ({ parents, selected, search, isLoading, onSearch, onSelect }) => (
  <aside className="flex min-h-0 w-64 shrink-0 flex-col rounded-lg border border-border bg-surface shadow-sm">
    <div className="flex items-center justify-between px-3 pt-3 text-xs">
      <span className="font-semibold text-text-primary">Parent SKUs</span>
      <span className="text-text-muted">sorted by spend</span>
    </div>
    <label className="mx-3 my-2 flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm text-text-muted focus-within:border-primary-500">
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search parent SKU"
        className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted"
      />
    </label>
    <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
      {isLoading && <li className="px-2 py-6 text-center text-xs text-text-muted">Loading…</li>}
      {!isLoading && parents.length === 0 && <li className="px-2 py-6 text-center text-xs text-text-muted">No parent SKUs</li>}
      {parents.map((parent) => {
        const used = parent.budget > 0 ? Math.min((parent.spend / parent.budget) * 100, 100) : 0
        return (
          <li key={parent.parentSku}>
            <button
              type="button"
              onClick={() => onSelect(parent.parentSku)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors',
                selected === parent.parentSku ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-surface-hover'
              )}
            >
              {parent.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={parent.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded bg-slate-200" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold uppercase text-text-primary">{parent.parentSku}</span>
                <span className="block truncate text-[10px] text-text-muted">
                  {parent.asin ?? '—'} · {parent.keywordCount} kw
                </span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full rounded-full bg-primary-500" style={{ width: `${used}%` }} />
                </span>
                <span className="mt-0.5 block text-right text-[10px] tabular-nums text-text-muted">
                  {formatCurrency(parent.spend)} / {formatCurrency(parent.budget)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  </aside>
)
