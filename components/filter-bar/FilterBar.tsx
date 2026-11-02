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

/** Wraps a DateRangePicker so it fills its filter box at the height of the other controls. */
export const FILL_PICKER = 'rounded-lg [&>div]:block [&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:py-0 [&>div>button>span]:flex-1 [&>div>button>span]:text-left'

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
  /** Apply button text; "Apply filters" by default. */
  applyLabel?: string
  /** Shown before the apply label, e.g. {@link FunnelIcon}. */
  applyIcon?: React.ReactNode
}

/** The funnel used on filter buttons across the app. */
export const FunnelIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

/**
 * Filter boxes (wrap each in {@link FilterItem}) on a grid of equal columns that spans the full width:
 * as many columns as fit, every box the same width, a short last row keeps that width instead of stretching.
 * Below, on their own row, the "n filters changed · not applied yet" hint and Reset / Apply filters.
 */
export const FilterBar: React.FC<FilterBarProps> = ({ children, pendingCount, activeCount, onApply, onReset, applyLabel = 'Apply filters', applyIcon }) => (
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
      <Button type="button" size="sm" className="h-10 gap-2" onClick={onApply} disabled={pendingCount === 0}>
        {applyIcon}
        {applyLabel}
      </Button>
    </div>
  </div>
)
