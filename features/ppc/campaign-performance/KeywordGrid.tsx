'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { KeywordRow, KeywordsResponse, SkuPerformance } from '@/types/campaignPerformance.types'
import { DayCell } from './DayCell'
import { MetricLabels } from './MetricLabels'

/** The first four columns stay put while the day columns scroll behind them: each sticks at the sum of the widths before it. */
const DAY_COL = ''

/** Widths in px, for the fixed table layout: a column never grows with its content, so the sticky offsets stay exact. */
const FIXED_COLUMN_WIDTHS = [170, 110, 170, 104]
/** Left offset of each fixed column: the widths before it. */
const STICKY_LEFT = FIXED_COLUMN_WIDTHS.map((_, index) => FIXED_COLUMN_WIDTHS.slice(0, index).reduce((sum, width) => sum + width, 0))
const [KEYWORD_AT, SPEND_AT, SKU_AT, LABEL_AT] = STICKY_LEFT

/**
 * Pins a cell at `left`. Set inline: the global `table td.sticky` rule forces every such cell to `left: 0`, which piles
 * the four fixed columns on top of each other.
 */
const stuckAt = (pinned: boolean, left: number): React.CSSProperties | undefined => (pinned ? { position: 'sticky', left } : undefined)

/** Room the day columns need beside the fixed block before it is worth pinning (about two days). */
const MIN_DAYS_BESIDE_FIXED = 2
const FIXED_COLUMNS_WIDTH = FIXED_COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0)
const DAY_COLUMN_WIDTH = 92

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

const SkuCell: React.FC<{ sku: SkuPerformance; pinned: boolean }> = ({ sku, pinned }) => (
  <td className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', 'z-10')} style={stuckAt(pinned, SKU_AT)}>
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

const KeywordCells: React.FC<{ row: KeywordRow; rowSpan: number; pinned: boolean }> = ({ row, rowSpan, pinned }) => (
  <>
    <td rowSpan={rowSpan} className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', 'z-10')} style={stuckAt(pinned, KEYWORD_AT)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="break-words text-sm font-semibold text-primary-600">{row.keyword}</span>
        {row.searchFrequency != null && (
          <span className="shrink-0 text-[10px] text-text-muted">Frequency: {row.searchFrequency.toLocaleString('en-US')}</span>
        )}
      </div>
      {row.campaignName && <p className="mt-1 break-words text-[11px] font-medium text-text-primary">{row.campaignName}</p>}
      {row.adGroupName && <p className="break-words text-[11px] text-text-muted">{row.adGroupName}</p>}
    </td>
    <td rowSpan={rowSpan} className={cn('border-b border-r border-border bg-surface px-3 py-2 align-top', 'z-10')} style={stuckAt(pinned, SPEND_AT)}>
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

  // Pin the four fixed columns only when they leave room for days beside them; in a narrower pane they scroll as usual
  const tableRef = useRef<HTMLTableElement>(null)
  const [pinned, setPinned] = useState(true)
  useEffect(() => {
    const scroller = tableRef.current?.parentElement
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setPinned(scroller.clientWidth >= FIXED_COLUMNS_WIDTH + MIN_DAYS_BESIDE_FIXED * DAY_COLUMN_WIDTH))
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  return (
    <table ref={tableRef} className="table-fixed border-separate border-spacing-0 text-left" style={{ width: FIXED_COLUMNS_WIDTH + days.length * DAY_COLUMN_WIDTH }}>
      <colgroup>
        {FIXED_COLUMN_WIDTHS.map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
        {days.map((day) => (
          <col key={day} style={{ width: DAY_COLUMN_WIDTH }} />
        ))}
      </colgroup>
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={cn(HEAD, 'z-30')} style={stuckAt(pinned, KEYWORD_AT)}>
            Keyword
            <span className="block text-[10px] font-normal text-text-muted">Campaign · Search Frequency</span>
          </th>
          <th className={cn(HEAD, 'z-30')} style={stuckAt(pinned, SPEND_AT)}>
            Total Spend
            <span className="block text-[10px] font-normal text-text-muted">Budget · % Used</span>
          </th>
          <th className={cn(HEAD, 'z-30')} style={stuckAt(pinned, SKU_AT)}>
            SKU / ASIN
            <span className="block text-[10px] font-normal text-text-muted">{skus.length} ASINs · Top 7d sales first</span>
          </th>
          <th className={cn(HEAD, 'z-30')} style={stuckAt(pinned, LABEL_AT)} aria-label="Figures" />
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
                {index === 0 && <KeywordCells row={row} rowSpan={skus.length} pinned={pinned} />}
                <SkuCell sku={sku} pinned={pinned} />
                <td className={cn('border-b border-r border-border bg-surface p-0 align-top', 'z-10')} style={stuckAt(pinned, LABEL_AT)}>
                  <MetricLabels />
                </td>
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
