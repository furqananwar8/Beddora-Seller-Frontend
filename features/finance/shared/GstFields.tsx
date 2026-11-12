'use client'

import React, { useState } from 'react'
import { Select } from '@/design-system/inputs'
import { useAppAbility } from '@/hooks/useAppAbility'
import { AddGstRateModal } from '@/features/settings/gst/AddGstRateModal'
import { useGetGstRatesQuery, type GstType } from '@/services/api/finance.api'
import { FormField } from './FormField'
import { GST_TYPE_OPTIONS } from './gst'
import { SelectShell } from './SelectShell'

interface GstTypeFieldProps {
  /** Prefix of the control's id, so several requests on one screen stay distinct. */
  id: string
  value: GstType
  onChange: (next: GstType) => void
  error?: string
}

/** How GST applies to a request's amounts: Inclusive, Exclusive or Not applicable. Each amount then picks its own percentage. */
export const GstTypeField: React.FC<GstTypeFieldProps> = ({ id, value, onChange, error }) => (
  <FormField label="GST" htmlFor={`${id}-gst`} error={error}>
    <SelectShell>
      <Select id={`${id}-gst`} className="appearance-none rounded-lg pr-9" value={value} onChange={(event) => onChange(event.target.value as GstType)} options={GST_TYPE_OPTIONS} />
    </SelectShell>
  </FormField>
)

/** The GST percentages to pick from (Settings > GST), and the one to start a line with when there is nothing to choose. */
export function useGstRates() {
  const { data: rates = [], isLoading } = useGetGstRatesQuery()
  return { rates, isLoading, onlyRateId: rates.length === 1 ? String(rates[0].id) : '' }
}

/** `<option>`s for the GST % select of an amount line. */
export const gstRateOptions = (rates: Array<{ id: number; rate: number }>, applies: boolean) => [
  { value: '', label: applies ? 'Select' : '—' },
  ...rates.map((rate) => ({ value: String(rate.id), label: `${rate.rate}%` })),
]

interface GstRateFieldProps {
  id: string
  label?: string
  /** Whether GST applies to the request; without it the select is off. */
  applies: boolean
  error?: string
  /** Extra classes for the label (see FormField). */
  labelClassName?: string
  /** Called with the id of a rate added from here (when the list is empty), so the line can pick it. */
  onAdded?: (rateId: string) => void
  children: (props: { options: ReturnType<typeof gstRateOptions>; disabled: boolean }) => React.ReactNode
}

/** The GST % of one amount line, labelled and with its error; the select itself is rendered by the caller so each form binds it its own way. */
export const GstRateField: React.FC<GstRateFieldProps> = ({ id, label = 'GST %', applies, error, labelClassName, onAdded, children }) => {
  const { rates, isLoading } = useGstRates()
  const canAdd = useAppAbility().can('write', 'settings:gst')
  const [adding, setAdding] = useState(false)
  const empty = applies && !isLoading && rates.length === 0
  return (
    <FormField
      label={label}
      htmlFor={id}
      required={applies}
      error={error}
      labelClassName={labelClassName}
      hint={
        empty ? (
          canAdd ? (
            <button type="button" onClick={() => setAdding(true)} className="font-medium text-primary-600 underline-offset-2 hover:underline">
              + Add GST rate
            </button>
          ) : (
            'No GST rates yet. Ask an admin to add them in Settings.'
          )
        ) : undefined
      }
    >
      <SelectShell>{children({ options: gstRateOptions(rates, applies), disabled: !applies })}</SelectShell>
      {adding && <AddGstRateModal isOpen onClose={() => setAdding(false)} onAdded={(rate) => onAdded?.(String(rate.id))} />}
    </FormField>
  )
}
