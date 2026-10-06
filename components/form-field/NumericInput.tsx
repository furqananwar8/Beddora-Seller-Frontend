'use client'

import React from 'react'
import { sanitizeNumeric } from '@/utils/numericInput'

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  /** Allow one decimal point. Whole numbers only by default. */
  decimal?: boolean
}

/**
 * Text input that only accepts numbers and drops leading zeros as the user types.
 * Works controlled or through react-hook-form's `register`, because the cleaned value is written to the
 * event target before the caller's `onChange` reads it.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(({ decimal = false, onChange, ...props }, ref) => (
  <input
    {...props}
    ref={ref}
    inputMode={decimal ? 'decimal' : 'numeric'}
    autoComplete="off"
    onChange={(event) => {
      const cleaned = sanitizeNumeric(event.target.value, { decimal })
      if (cleaned !== event.target.value) event.target.value = cleaned
      onChange?.(event)
    }}
  />
))
NumericInput.displayName = 'NumericInput'
