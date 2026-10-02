'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'

interface FilterBarProps {
  children: React.ReactNode
  /** Boxes changed since the last apply. */
  pendingCount: number
  /** Filters in effect (or about to be); enables Reset. */
  activeCount: number
  onApply: () => void
  onReset: () => void
}

/** Filter controls, the "n filters selected · not applied yet" hint, and Reset / Apply filters. */
export const FilterBar: React.FC<FilterBarProps> = ({ children, pendingCount, activeCount, onApply, onReset }) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">{children}</div>
    <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
      {pendingCount > 0 && (
        <span role="status" className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700">
          {pendingCount} {pendingCount === 1 ? 'filter' : 'filters'} changed · not applied yet
        </span>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={activeCount === 0 && pendingCount === 0}>
        Reset
      </Button>
      <Button type="button" size="sm" onClick={onApply} disabled={pendingCount === 0}>
        Apply filters
      </Button>
    </div>
  </div>
)
