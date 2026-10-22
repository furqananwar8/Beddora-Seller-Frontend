'use client'

import React from 'react'
import { cn } from '@/utils/cn'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Opens under the trigger instead of above it (e.g. in a table, where the header would cover it). */
  side?: 'top' | 'bottom'
  /**
   * Wraps long text in a fixed-width box. Such a tooltip is not rendered until hover, so inside a scroll area it never
   * widens what scrolls.
   */
  multiline?: boolean
  /** `start` lines the tooltip up with the trigger's left edge, so a wide tooltip near a clipping edge stays visible. */
  align?: 'center' | 'start'
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className, side = 'top', multiline = false, align = 'center' }) => {
  return (
    <span className={cn('relative inline-flex group/tooltip', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 rounded-md bg-text-primary px-2 py-1 text-xs text-text-inverse shadow-sm',
          align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-1',
          multiline
            ? 'hidden w-72 whitespace-normal text-left leading-snug group-hover/tooltip:block'
            : 'whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100'
        )}
      >
        {content}
      </span>
    </span>
  )
}
