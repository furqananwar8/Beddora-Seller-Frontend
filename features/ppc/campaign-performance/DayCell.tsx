'use client'

import React from 'react'
import { Tooltip } from '@/design-system/tooltips'
import type { DayMetrics, RankCell } from '@/types/campaignPerformance.types'
import { METRIC_COLUMNS } from './metricColumns'
import { METRIC_LINE, MetricLines, RANK_BLOCK } from './MetricLines'
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
          RANK_BLOCK, 'flex items-center justify-center px-1 text-center font-semibold leading-tight text-slate-900',
          display.background ? 'text-base' : 'bg-slate-100 text-[11px] font-medium text-text-muted'
        )}
        style={display.background ? { background: display.background } : undefined}
      >
        {display.label}
      </div>
      <MetricLines className="items-center">
        {METRIC_COLUMNS.map((metric) => {
          const value = metrics ? metric.read(metrics) : null
          return (
            <Tooltip key={metric.key} content={metric.description ?? metric.label} side="bottom" className={cn(METRIC_LINE, 'w-full items-center justify-center')}>
              <span className={cn('tabular-nums', value == null ? 'text-text-muted' : metric.tone)}>
                {value == null ? '—' : metric.format(value)}
              </span>
            </Tooltip>
          )
        })}
      </MetricLines>
    </div>
  )
}
