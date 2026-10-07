'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'

interface FilterItemProps {
  children: React.ReactNode
  /** Takes two columns (search boxes). */
  wide?: boolean
  className?: string
}

/** A toggle filling its filter box: options share the width by label length, so a long label stays on one line. */
export const FILL_TOGGLE = 'flex w-full [&>button]:flex-auto [&>button]:px-2'

/** One filter box: one column of the filter grid, or two when `wide`. */
export const FilterItem: React.FC<FilterItemProps> = ({ children, wide, className }) => (
  <div className={cn('min-w-0', wide && 'sm:col-span-2', className)}>{children}</div>
)

interface FilterBarProps {
  children: React.ReactNode
  /** Boxes changed since the last apply. */
  pendingCount: number
  /** Filters in effect (or about to be); enables Reset. */
  activeCount: number
  onApply: () => void
  onReset: () => void
}

/**
 * Filter boxes (wrap each in {@link FilterItem}) on a grid of equal columns that spans the full width:
 * as many columns as fit, every box the same width, a short last row keeps that width instead of stretching.
 * Below, on their own row, the "n filters changed · not applied yet" hint and Reset / Apply filters.
 */
export const FilterBar: React.FC<FilterBarProps> = ({ children, pendingCount, activeCount, onApply, onReset }) => (
  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
    {children}
    <div className="col-span-full flex flex-wrap items-center justify-end gap-2">
      {pendingCount > 0 && (
        <span role="status" className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700">
          {pendingCount} {pendingCount === 1 ? 'filter' : 'filters'} changed · not applied yet
        </span>
      )}
      <Button type="button" variant="outline" size="sm" className="h-10" onClick={onReset} disabled={activeCount === 0 && pendingCount === 0}>
        Reset
      </Button>
      <Button type="button" size="sm" className="h-10" onClick={onApply} disabled={pendingCount === 0}>
        Apply filters
      </Button>
    </div>
  </div>
)
