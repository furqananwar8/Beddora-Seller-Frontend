'use client'

import { Fragment, useState } from 'react'
import { Card } from '@/design-system/cards'
import { deltaClass } from './CompareSalesSnapshot'
import {
  PERIODS,
  formatMoney,
  formatPercent,
  partialTotals,
  percentChange,
  type Comparison,
  type ComparisonKey,
  type HourlyPoint,
  type PartialTotals,
} from './compareSales.utils'

interface Props {
  comparisons: Comparison[]
  hourly: { units: HourlyPoint[]; sales: HourlyPoint[]; orderItems: HourlyPoint[] }
  currency: string
}

interface Column {
  label: string
  value: (c: Comparison) => number
  format: (v: number, currency: string) => string
  /** Higher is worse: the delta colours invert. */
  inverse?: boolean
  /** Same-time-of-day value; absent for metrics only known per day (ad spend). */
  partial?: (p: PartialTotals) => number
}

const COLUMNS: Column[] = [
  { label: 'Order items', value: (c) => c.orderItems, format: (v) => String(v), partial: (p) => p.orderItems },
  { label: 'Units ordered', value: (c) => c.units, format: (v) => String(v), partial: (p) => p.units },
  { label: 'Ordered product sales', value: (c) => c.sales, format: formatMoney, partial: (p) => p.sales },
  { label: 'Ad spend', value: (c) => c.adSpend, format: formatMoney, inverse: true },
  { label: 'Avg. units / order item', value: (c) => c.avgUnits, format: (v) => v.toFixed(2), partial: (p) => p.avgUnits },
  { label: 'Avg. sales / order item', value: (c) => c.avgSales, format: formatMoney, partial: (p) => p.avgSales },
]

const COMPARED_TO: { key: Exclude<ComparisonKey, 'today'>; label: string; through: string }[] = [
  { key: 'yesterday', label: 'vs previous period', through: 'Previous period' },
  { key: 'lastWeek', label: 'vs same period last week', through: 'Same period last week' },
  { key: 'lastYear', label: 'vs same period last year', through: 'Same period last year' },
]

const CELL = 'px-4 py-3 text-right tabular-nums'

export function CompareSalesTable({ comparisons, hourly, currency }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const byKey = Object.fromEntries(comparisons.map((c) => [c.key, c])) as Record<
    ComparisonKey,
    Comparison
  >
  const current = byKey.today
  if (!current) {
    return (
      <Card className="p-8 text-center text-text-muted">
        No data available. Press <strong>Apply Filters</strong> to load.
      </Card>
    )
  }

  const now = new Date()
  const throughHour = now.getHours()
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const currentPartial = partialTotals('today', throughHour, hourly)

  return (
    <Card className="overflow-hidden">
      <div className="ds-scroll-x">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Period</th>
              {COLUMNS.map((col) => (
                <th key={col.label} className="px-4 py-3 text-right font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERIODS.map((period) => {
              const row = byKey[period.key]
              if (!row) return null
              return (
                <tr key={period.key} className="border-b border-border">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-text-primary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: period.color }} />
                      {period.label}
                    </span>
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.label} className={CELL}>
                      {col.format(col.value(row), currency)}
                    </td>
                  ))}
                </tr>
              )
            })}

            {COMPARED_TO.map((target) => {
              const other = byKey[target.key]
              if (!other) return null
              const open = !!expanded[target.key]

              return (
                <Fragment key={target.key}>
                  <tr className="border-b border-border bg-surface-secondary">
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [target.key]: !open }))}
                        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary"
                        aria-expanded={open}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-border text-xs font-bold">
                          {open ? '−' : '+'}
                        </span>
                        % change {target.label}
                      </button>
                    </td>
                    {COLUMNS.map((col) => {
                      const change = percentChange(col.value(current), col.value(other))
                      return (
                        <td key={col.label} className={`${CELL} py-2 font-medium ${deltaClass(change, col.inverse)}`}>
                          {formatPercent(change)}
                        </td>
                      )
                    })}
                  </tr>

                  {open && (
                    <>
                      <PartialRow label={`Current period through ${timeLabel}`} partial={currentPartial} currency={currency} />
                      <PartialRow
                        label={`${target.through} through ${timeLabel}`}
                        partial={partialTotals(target.key, throughHour, hourly)}
                        currency={currency}
                        muted
                      />
                    </>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function PartialRow({
  label,
  partial,
  currency,
  muted = false,
}: {
  label: string
  partial: PartialTotals
  currency: string
  muted?: boolean
}) {
  return (
    <tr className={`border-b border-border text-text-secondary ${muted ? 'bg-surface-secondary/60' : ''}`}>
      <td className="py-2 pl-10 pr-4">{label}</td>
      {COLUMNS.map((col) => (
        <td key={col.label} className={`${CELL} py-2`}>
          {col.partial ? col.format(col.partial(partial), currency) : '—'}
        </td>
      ))}
    </tr>
  )
}
