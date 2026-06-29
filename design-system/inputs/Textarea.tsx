'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Textarea component - Pure UI component
 */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const reactId = React.useId()
    const textareaId = id || `textarea-${reactId}`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="ds-input-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'ds-input resize-y',
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

Textarea.displayName = 'Textarea'

