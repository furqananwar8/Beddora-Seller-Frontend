'use client'

import React from 'react'
import { Controller, UseFormReturn, useWatch } from 'react-hook-form'
import { fieldClass, FormField } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { allLines, summarize, type PoFormValues } from './poForm'

/** What the second part of the terms can be due on: its title is picked from these and can be changed, never removed. */
export const BALANCE_TERMS = ['Against B/L on sight', 'Against shipping documents', 'Against delivery', 'On receipt of goods', 'Before shipment', 'Net 30', 'Net 45', 'Net 60']

/** Keeps what was typed (so "25." and "25.0" survive on the way to "25.5"), up to 2 decimals and no more than 100. */
export const clamp = (text: string): string => {
  const trimmed = text.replace(/^(\d*\.\d{2}).*$/, '$1')
  return Number(trimmed) > 100 ? '100' : trimmed
}
const complement = (text: string): string => (text === '' ? '' : String(Math.round((100 - Number(text)) * 100) / 100))

interface PoPaymentTermsProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
}

/**
 * Payment terms: an advance %, and the rest due on a chosen term. The PO's amount (all its batches and their unit rates)
 * is known here, so each part shows what it comes to. The two percentages always add up to 100.
 */
export const PoPaymentTerms: React.FC<PoPaymentTermsProps> = ({ form, readOnly }) => {
  const { control, setValue, formState: { errors } } = form
  const [batches, samples, currency, advance, balance] = useWatch({ control, name: ['batches', 'samples', 'currency', 'advancePercent', 'balancePercent'] })
  const total = summarize(allLines(batches ?? []), samples ?? []).poAmount
  const amountOf = (percent: string) => Math.round(total * Number(percent || 0)) / 100
  const advanceAmount = amountOf(advance)
  // The balance takes the cent the advance rounded off, so the two parts add up to the PO amount
  const balanceAmount = Math.round((total - advanceAmount) * 100) / 100

  const rowClass = 'grid items-center gap-x-3 gap-y-1 sm:grid-cols-[14rem_7rem_minmax(0,1fr)]'
  const percentField = (name: 'advancePercent' | 'balancePercent', label: string, other: 'advancePercent' | 'balancePercent') => (
    <div className="relative">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <NumericInput
            decimal
            aria-label={label}
            readOnly={readOnly}
            className={cn(fieldClass(errors[name]?.message), 'pr-7 text-right tabular-nums')}
            value={field.value}
            onChange={(event) => {
              const next = clamp(event.target.value)
              field.onChange(next)
              // The two parts always add up to 100
              setValue(other, complement(next), { shouldDirty: true, shouldValidate: true })
            }}
          />
        )}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted">%</span>
    </div>
  )

  return (
    <FormField label="Payment terms" className="sm:col-span-2 lg:col-span-3" error={errors.advancePercent?.message ?? errors.balancePercent?.message} hint={total > 0 ? `Of the PO amount ${formatCurrency(total, currency)}, from all its batches` : 'Add products with rates to see the amounts'}>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="po-payment-terms">
        <div className={rowClass}>
          <span className="text-sm font-medium text-text-primary">Advance</span>
          {percentField('advancePercent', 'Advance percent', 'balancePercent')}
          <span className="text-sm tabular-nums text-text-secondary" data-testid="advance-amount">{formatCurrency(advanceAmount, currency)}</span>
        </div>
        <div className={rowClass}>
          <Controller
            control={control}
            name="balanceTerm"
            render={({ field }) => (
              <SearchableSelect<string>
                ariaLabel="Balance due on"
                options={BALANCE_TERMS}
                getKey={(option) => option}
                getLabel={(option) => option}
                value={field.value}
                onChange={field.onChange}
                searchable={false}
                disabled={readOnly}
              />
            )}
          />
          {percentField('balancePercent', 'Balance percent', 'advancePercent')}
          <span className="text-sm tabular-nums text-text-secondary" data-testid="balance-amount">{formatCurrency(balanceAmount, currency)}</span>
        </div>
      </div>
    </FormField>
  )
}
