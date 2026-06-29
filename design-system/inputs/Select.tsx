'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Select component - Pure UI component
 */

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, id, ...props }, ref) => {
    const reactId = React.useId()
    const selectId = id || `select-${reactId}`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="ds-input-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'ds-input',
            error
              ? 'ds-input-error'
              : 'ds-input-default',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="ds-input-error-text">{error}</p>
        )}
        {helperText && !error && (
          <p className="ds-input-helper">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

