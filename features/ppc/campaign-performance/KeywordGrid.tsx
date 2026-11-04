'use client'

import React, { useMemo } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { KeywordRow, KeywordsResponse, SkuPerformance } from '@/types/campaignPerformance.types'
import { DayCell } from './DayCell'

const KEYWORD_COL = 'w-[230px] min-w-[230px]'
const SPEND_COL = 'w-[150px] min-w-[150px]'
const SKU_COL = 'w-[210px] min-w-[210px]'
const DAY_COL = 'w-[92px] min-w-[92px]'

const HEAD = 'border-b border-r border-border bg-surface px-3 py-2 text-left align-top text-xs font-semibold text-text-primary'

interface KeywordGridProps {
  data: KeywordsResponse
}

const DayHeader: React.FC<{ day: string }> = ({ day }) => {
  const date = parseISO(day)
  return (
    <th className={cn(HEAD, DAY_COL, 'text-center')}>
      <span className="block text-primary-600">{format(date, 'd MMM')}</span>
      {isToday(date) && <span className="block text-[10px] font-normal text-text-muted">(Today)</span>}
    </th>
  )
}

const SkuCell: React.FC<{ sku: SkuPerformance }> = ({ sku }) => (
  <td className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', SKU_COL)}>
    <div className="flex items-start gap-2">
      {sku.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sku.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded bg-slate-200" aria-hidden />
      )}
      <div className="min-w-0 text-xs">
        <p className="break-words font-semibold uppercase leading-tight text-primary-600">{sku.sku}</p>
        <p className="text-[10px] text-text-muted">{sku.asin ?? '—'}</p>
        <p className="mt-1 text-[10px] text-text-muted">7d ADS: {sku.ads7d.toLocaleString('en-US')}</p>
      </div>
    </div>
  </td>
)

const KeywordCells: React.FC<{ row: KeywordRow; rowSpan: number }> = ({ row, rowSpan }) => (
  <>
    <td rowSpan={rowSpan} className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', KEYWORD_COL)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="break-words text-sm font-semibold text-primary-600">{row.keyword}</span>
        {row.searchFrequency != null && (
          <span className="shrink-0 text-[10px] text-text-muted">Frequency: {row.searchFrequency.toLocaleString('en-US')}</span>
        )}
      </div>
      {row.campaignName && <p className="mt-1 break-words text-[11px] font-medium text-text-primary">{row.campaignName}</p>}
      {row.adGroupName && <p className="break-words text-[11px] text-text-muted">{row.adGroupName}</p>}
    </td>
    <td rowSpan={rowSpan} className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', SPEND_COL)}>
      <p className="text-sm tabular-nums">
        <span className="font-semibold text-primary-600">{formatCurrency(row.spend)}</span>
        <span className="text-text-muted"> of {formatCurrency(row.budget)}</span>
      </p>
      <p className="mt-1 text-xs font-semibold tabular-nums text-text-primary">{row.percentUsed}%</p>
      <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full bg-slate-200">
        <span className="block h-full rounded-full bg-primary-500" style={{ width: `${Math.min(row.percentUsed, 100)}%` }} />
      </span>
    </td>
  </>
)

/** The grid: keyword and its spend on the left, then one block per SKU with a column per day. */
export const KeywordGrid: React.FC<KeywordGridProps> = ({ data }) => {
  const { days, skus, items } = useMemo(() => data, [data])

  return (
    <table className="border-separate border-spacing-0 text-left">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={cn(HEAD, KEYWORD_COL)}>
            Keyword
            <span className="block text-[10px] font-normal text-text-muted">Campaign · Search Frequency</span>
          </th>
          <th className={cn(HEAD, SPEND_COL)}>
            Total Spend
            <span className="block text-[10px] font-normal text-text-muted">Budget · % Used</span>
          </th>
          <th className={cn(HEAD, SKU_COL)}>
            SKU / ASIN
            <span className="block text-[10px] font-normal text-text-muted">{skus.length} ASINs · Top 7d sales first</span>
          </th>
          {days.map((day) => (
            <DayHeader key={day} day={day} />
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((row) =>
          skus.map((sku, index) => {
            const ranks = row.asins.find((entry) => entry.asin === sku.asin)?.ranks
            return (
              <tr key={`${row.id}-${sku.sku}`}>
                {index === 0 && <KeywordCells row={row} rowSpan={skus.length} />}
                <SkuCell sku={sku} />
                {days.map((day) => (
                  <td key={day} className={cn('border-b border-r border-border p-0 align-top', DAY_COL)}>
                    <DayCell rank={ranks?.[day]} metrics={sku.daily[day]} />
                  </td>
                ))}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
