'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { METRIC_COLUMNS } from './metricColumns'
import { RANK_LEGEND_GRADIENT } from './rankScale'

/** The colour key above the grid: each figure's colour, and the rank scale. */
export const MetricLegend: React.FC = () => (
  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px]">
    <span className="font-medium text-text-muted">Figures</span>
    {METRIC_COLUMNS.map((metric) => (
      <span key={metric.key} className={cn('font-medium', metric.tone)}>
        {metric.label}
      </span>
    ))}
    <span className="ml-2 flex items-center gap-1.5 text-text-muted">
      Rank 1
      <span className="h-2.5 w-24 rounded-full" style={{ background: RANK_LEGEND_GRADIENT }} aria-hidden />
    </span>
  </div>
)
