'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'

interface ApplyFiltersButtonProps {
  onClick?: () => void
  /** Draft filters differ from the applied ones: the button gets primary styling. */
  pending?: boolean
  disabled?: boolean
}

/** The "Apply Filters" button of the profit screens' filter bars: filters take effect only when it is pressed. */
export function ApplyFiltersButton({ onClick, pending = false, disabled = false }: ApplyFiltersButtonProps) {
  return (
    <Button
      variant={pending ? 'primary' : 'ghost'}
      onClick={onClick}
      disabled={disabled}
      className={`
        min-w-[140px]
        shrink-0
        whitespace-nowrap
        flex
        items-center
        justify-center
        gap-2
        ${pending ? '' : 'bg-surface border border-border hover:bg-surface-tertiary text-text-primary'}
      `}
      title="Apply filters"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 10h12M10 16h4M11 22h2" />
      </svg>
      <span className="whitespace-nowrap">Apply Filters</span>
    </Button>
  )
}
