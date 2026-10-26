'use client'

import React, { useEffect, useRef } from 'react'
import { Control, useController, useWatch } from 'react-hook-form'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { FormField } from '../shared/FormField'
import { dueDateFor, paymentTermLabel } from '../shared/paymentTerm'
import type { PaymentRequestFormValues } from './schema'

interface DueDateFieldProps {
  control: Control<PaymentRequestFormValues>
  /** The partner's payment term; the due date follows invoice date + term until changed here. */
  termDays: number | null
  className?: string
}

/**
 * This request's due date. It follows the invoice date plus the partner's term until it is changed by hand
 * (or opens saved with a different date); the change is the request's own and leaves the partner's term alone.
 */
export const DueDateField: React.FC<DueDateFieldProps> = ({ control, termDays, className }) => {
  const invoiceDate = useWatch({ control, name: 'invoiceDate' })
  const { field, fieldState } = useController({ control, name: 'dueDate' })
  const termDue = dueDateFor(invoiceDate, termDays)

  // Decided the first time the term gives a date, so a saved request keeps a date that was changed by hand
  const following = useRef<boolean | null>(null)
  if (following.current === null && termDue) following.current = field.value === '' || field.value === termDue

  useEffect(() => {
    if (following.current && termDue && field.value !== termDue) field.onChange(termDue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termDue])

  const change = (next: string) => {
    following.current = next === termDue
    field.onChange(next)
  }

  const custom = Boolean(termDue) && field.value !== termDue
  const hint = !termDays ? 'The partner has no payment term' : custom ? `Changed for this request only; the term (${paymentTermLabel(termDays)}) gives ${termDue}` : `Invoice date + ${paymentTermLabel(termDays)}`

  return (
    <FormField label="Due date" htmlFor="dueDate" error={fieldState.error?.message} hint={hint} className={className}>
      <SingleDatePicker id="dueDate" value={field.value} onChange={change} error={fieldState.error?.message} />
      {custom && (
        <button type="button" onClick={() => change(termDue)} className="mt-1 text-xs font-medium text-primary-600 hover:underline">
          Use the partner&apos;s term
        </button>
      )}
    </FormField>
  )
}
