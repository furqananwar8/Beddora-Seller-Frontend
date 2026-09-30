'use client'

import React from 'react'
import { cn } from '@/utils/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  disabled?: boolean
}

/** Pill-style single choice control (Vendor / Supplier, Full / Split, Bank / Credit card). */
export function SegmentedToggle<T extends string>({ options, value, onChange, ariaLabel, className, disabled }: SegmentedToggleProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-lg bg-secondary-100 p-1', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
