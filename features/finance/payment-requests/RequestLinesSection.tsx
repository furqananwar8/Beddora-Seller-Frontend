'use client'

import React from 'react'
import { Control, Controller, FieldErrors, UseFormRegister, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import type { CostCenterOption } from '@/services/api/finance.api'
import { CostCenterField } from '../shared/CostCenterSelect'
import { FormField } from '../shared/FormField'
import { FormSection as Section } from '../shared/FormSection'
import { formatCurrencyAmount, formatMoney } from '../shared/format'
import { SelectShell } from '../shared/SelectShell'
import { DueDateField } from './DueDateField'
import { MAX_REQUEST_LINES, PaymentRequestFormValues, PoLimit, emptyLine, parseAmount, poLimitMessage, requestTotal } from './schema'

interface RequestLinesSectionProps {
  control: Control<PaymentRequestFormValues>
  register: UseFormRegister<PaymentRequestFormValues>
  errors: FieldErrors<PaymentRequestFormValues>
  currencyOptions: Array<{ value: string; label: string }>
  /** What set the currency (the picked purchase order or invoice), so it cannot be changed here; null when free. */
  currencyLockedBy: string | null
  /** The picked PO's open balance, shown and enforced on the total of a purchase-order request. */
  poLimit: PoLimit | null
  /** The partner's payment term, which sets the due date. */
  termDays: number | null
  costCenters: CostCenterOption[] | undefined
  loadingCostCenters: boolean
  addCostCenterHref: string
  onAddCostCenter: () => void
}

/** Currency and due date, then one or more amounts each booked to an expense (L4 cost center), their total, and remarks. */
export const RequestLinesSection: React.FC<RequestLinesSectionProps> = ({
  control,
  register,
  errors,
  currencyOptions,
  currencyLockedBy,
  poLimit,
  termDays,
  costCenters,
  loadingCostCenters,
  addCostCenterHref,
  onAddCostCenter,
}) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'lines', keyName: 'key' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const currency = useWatch({ control, name: 'currency' })
  const full = fields.length >= MAX_REQUEST_LINES
  const several = fields.length > 1
  // A rule on the whole list (the PO cap) lands on `root` of a field array
  const linesError = errors.lines?.message ?? errors.lines?.root?.message

  return (
    <Section title="Amount & category" note={`split across up to ${MAX_REQUEST_LINES} expenses`}>
      <div className="mb-4 grid gap-4 sm:grid-cols-[12rem_minmax(0,16rem)]">
        <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message} hint={currencyLockedBy ?? undefined}>
          <SelectShell>
            <Select id="currency" className="appearance-none rounded-lg pr-9" disabled={currencyLockedBy !== null} options={[{ value: '', label: 'Select' }, ...currencyOptions]} {...register('currency')} />
          </SelectShell>
        </FormField>
        <DueDateField control={control} termDays={termDays} />
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const rowErrors = errors.lines?.[index]
          return (
            <div key={field.key} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
              <FormField label={several ? `Amount ${index + 1}` : 'Amount'} htmlFor={`lines.${index}.amount`} required error={rowErrors?.amount?.message}>
                <Controller
                  control={control}
                  name={`lines.${index}.amount`}
                  render={({ field: amount }) => (
                    <Input
                      id={`lines.${index}.amount`}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-lg text-right"
                      value={amount.value}
                      ref={amount.ref}
                      onChange={(event) => amount.onChange(event.target.value)}
                      onBlur={() => {
                        const parsed = parseAmount(amount.value)
                        if (amount.value.trim() && Number.isFinite(parsed)) amount.onChange(formatMoney(parsed))
                        amount.onBlur()
                      }}
                    />
                  )}
                />
              </FormField>
              <FormField label="Expense" htmlFor={`lines.${index}.costCenterId`} required error={rowErrors?.costCenterId?.message}>
                <CostCenterField
                  control={control}
                  name={`lines.${index}.costCenterId`}
                  id={`lines.${index}.costCenterId`}
                  options={costCenters}
                  loading={loadingCostCenters}
                  addHref={addCostCenterHref}
                  onAdd={onAddCostCenter}
                />
              </FormField>
              {several ? (
                <button
                  type="button"
                  aria-label={`Remove amount ${index + 1}`}
                  onClick={() => remove(index)}
                  className="mt-6 h-10 w-8 rounded-lg text-lg text-text-subtle hover:bg-secondary-100 hover:text-danger-600"
                >
                  ×
                </button>
              ) : (
                <span className="hidden w-8 sm:block" />
              )}
            </div>
          )
        })}
      </div>
      {linesError ? (
        <p className="mt-2 text-sm text-danger-600">{linesError}</p>
      ) : (
        poLimit && <p className="mt-2 text-xs text-text-muted">{poLimitMessage(poLimit)}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span>
          <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => append(emptyLine)}>
            + Add amount
          </Button>
          {full && <span className="ml-2 text-xs text-text-muted">Limit of {MAX_REQUEST_LINES} reached</span>}
        </span>
        {(several || poLimit) && (
          <span className="text-sm font-semibold text-text-primary">
            Total {formatCurrencyAmount(currency || '—', requestTotal(lines))}
          </span>
        )}
      </div>

      <FormField label="Remarks" htmlFor="remarks" className="mt-4" error={errors.remarks?.message}>
        <Textarea id="remarks" rows={2} className="rounded-lg" placeholder="Ocean freight Shanghai to Vancouver, Sep batch." {...register('remarks')} />
      </FormField>
    </Section>
  )
}
