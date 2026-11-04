'use client'

import React from 'react'
import { Tooltip } from '@/design-system/tooltips'
import type { DayMetrics, RankCell } from '@/types/campaignPerformance.types'
import { METRIC_COLUMNS } from './metricColumns'
import { describeRank } from './rankScale'
import { cn } from '@/utils/cn'

interface DayCellProps {
  rank: RankCell | undefined
  metrics: DayMetrics | undefined
}

/** One SKU's day: its rank for the keyword (coloured) above the stacked figures; hovering a figure names it. */
export const DayCell: React.FC<DayCellProps> = ({ rank, metrics }) => {
  const display = describeRank(rank)
  return (
    <div className="flex h-full flex-col">
      <div
        title={display.title}
        className={cn(
          'flex min-h-[40px] items-center justify-center px-1 text-center font-semibold leading-tight text-slate-900',
          display.background ? 'text-base' : 'bg-slate-100 text-[11px] font-medium text-text-muted'
        )}
        style={display.background ? { background: display.background } : undefined}
      >
        {display.label}
      </div>
      <div className="flex flex-1 flex-col items-center gap-px px-1 py-1 text-[11px] leading-tight">
        {METRIC_COLUMNS.map((metric) => {
          const value = metrics?.[metric.key]
          return (
            <Tooltip key={metric.key} content={metric.label} side="bottom" className="w-full justify-center">
              <span className={cn('tabular-nums', value == null ? 'text-text-muted' : metric.tone)}>
                {value == null ? '—' : metric.format(value)}
              </span>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
