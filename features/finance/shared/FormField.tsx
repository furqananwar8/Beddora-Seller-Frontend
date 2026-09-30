import React from 'react'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** Label, control slot, hint and validation message laid out the same way on every finance form. */
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, required, error, hint, className, children }) => (
  <div className={cn('min-w-0', className)}>
    <label htmlFor={htmlFor} className="ds-input-label">
      {label}
      {required && <span className="text-danger-600"> *</span>}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
  </div>
)

export const fieldClass = (error?: string) => cn('ds-input', error ? 'ds-input-error' : 'ds-input-default', 'rounded-lg')

/** Class for a native <select> that sits inside <SelectShell>. */
export const selectClass = (error?: string) => cn(fieldClass(error), 'appearance-none pr-9')
