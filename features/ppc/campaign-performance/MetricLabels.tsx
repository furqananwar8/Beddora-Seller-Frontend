import React from 'react'
import { cn } from '@/utils/cn'
import { METRIC_COLUMNS } from './metricColumns'
import { METRIC_LINE, MetricLines, RANK_BLOCK } from './MetricLines'

/** The label column: the name of each stacked figure, on the same line as its value in the day cells. */
export const MetricLabels: React.FC = () => (
  <div className="flex h-full flex-col">
    <div className={cn(RANK_BLOCK, 'flex items-center px-2 text-[11px] font-medium text-text-muted')}>Rank</div>
    <MetricLines>
      {METRIC_COLUMNS.map((metric) => (
        <span key={metric.key} title={metric.description ?? metric.label} className={cn(METRIC_LINE, 'flex items-center truncate px-1 font-medium', metric.tone)}>
          {metric.label}
        </span>
      ))}
    </MetricLines>
  </div>
)
