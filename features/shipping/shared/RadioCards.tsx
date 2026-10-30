import React from 'react'
import { cn } from '@/utils/cn'

export interface RadioCardOption<T extends string> {
  value: T
  title: string
  description?: string
  disabled?: boolean
}

interface RadioCardsProps<T extends string> {
  name: string
  ariaLabel: string
  options: RadioCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  /** Grid columns from `sm` up. */
  columns?: 1 | 2 | 3
  className?: string
}

const COLUMNS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }

/** A single choice shown as bordered cards with a title and a short explanation (duties, handover, label format). */
export function RadioCards<T extends string>({ name, ariaLabel, options, value, onChange, columns = 3, className }: RadioCardsProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid grid-cols-1 gap-2', COLUMNS[columns], className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
              active ? 'border-primary-500 bg-secondary-100 ring-1 ring-primary-500' : 'border-border hover:bg-secondary-50',
              option.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="mt-0.5 h-4 w-4 accent-primary-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text-primary">{option.title}</span>
              {option.description && <span className="block text-xs text-text-muted">{option.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}
