'use client'

import React from 'react'
import { cn } from '@/utils/cn'

export interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-xs text-text-inverse opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  )
}

