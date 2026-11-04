import React from 'react'
import { cn } from '@/utils/cn'

/** Height of the rank block and of each figure line. The label column and the day cells share them so lines align. */
export const RANK_BLOCK = 'h-10'
export const METRIC_LINE = 'h-4'

/** The stack of figure lines under a rank block: the same box in the label column and in every day cell. */
export const MetricLines: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex flex-1 flex-col gap-px px-1 py-1 text-[11px] leading-none', className)}>{children}</div>
)
