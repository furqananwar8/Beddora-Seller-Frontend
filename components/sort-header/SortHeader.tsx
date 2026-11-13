'use client'

import React from 'react'
import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpNarrowWide } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

interface SortHeaderProps {
  /** Whether the list is ordered by this column right now, and which way. */
  direction: SortDirection | null
  onClick: () => void
  children: React.ReactNode
}

/** A column title that orders the list by its column: the arrow shows the active direction. */
export const SortHeader: React.FC<SortHeaderProps> = ({ direction, onClick, children }) => (
  <button type="button" onClick={onClick} className="group inline-flex items-center gap-1.5 whitespace-nowrap hover:text-text-primary" aria-sort={direction === null ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}>
    {children}
    {direction === null ? (
      <ArrowUpDown aria-hidden className="h-3.5 w-3.5 text-text-tertiary opacity-60 group-hover:opacity-100" />
    ) : direction === 'asc' ? (
      <ArrowUpNarrowWide aria-hidden className="h-3.5 w-3.5 text-primary-600" />
    ) : (
      <ArrowDownWideNarrow aria-hidden className="h-3.5 w-3.5 text-primary-600" />
    )}
  </button>
)
