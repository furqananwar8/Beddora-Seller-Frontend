import React from 'react'
import { cn } from '@/utils/cn'
import { LabelNote } from '@/components/label-note/LabelNote'

interface FormFieldProps {
  /** Plain text (a trailing "(note)" goes on its own line under it) or your own markup, shown as it is. */
  label: React.ReactNode
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  className?: string
  /** Extra classes for the label, e.g. `sm:sr-only` to show it only where a shared header does not. */
  labelClassName?: string
  children: React.ReactNode
}

/** Label, control slot, hint and validation message laid out the same way on every form. */
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, required, error, hint, className, labelClassName, children }) => (
  <div className={cn('min-w-0', className)}>
    <label htmlFor={htmlFor} className={cn('ds-input-label', labelClassName)}>
      <LabelNote suffix={required && <span className="text-danger-600"> *</span>}>{label}</LabelNote>
    </label>
    {children}
    {error ? <p data-field-error className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
  </div>
)

export const fieldClass = (error?: string) => cn('ds-input', error ? 'ds-input-error' : 'ds-input-default', 'rounded-lg')

/** Class for a native <select> that sits inside <SelectShell>. */
export const selectClass = (error?: string) => cn(fieldClass(error), 'appearance-none pr-9')

/** After a failed submit: bring the first field with a validation message into view and focus its control. */
export function scrollToFirstFieldError() {
  requestAnimationFrame(() => {
    const message = document.querySelector<HTMLElement>('[data-field-error]')
    if (!message) return
    const field = message.parentElement
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true })
  })
}
