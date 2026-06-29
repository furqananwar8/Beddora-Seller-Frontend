'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Input component - Pure UI component
 * 
 * Usage:
 * <Input
 *   type="email"
 *   placeholder="Enter your email"
 *   value={value}
 *   onChange={handleChange}
 * />
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    // Stable, SSR-safe id to avoid hydration mismatches
    const reactId = React.useId()
    const inputId = id || `input-${reactId}`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="ds-input-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'ds-input',
            error
              ? 'ds-input-error'
              : 'ds-input-default',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input'

