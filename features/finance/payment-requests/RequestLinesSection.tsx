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
import { MAX_REQUEST_LINES, PaymentRequestFormValues, PoLimit, emptyLine, parseAmount, poLimitMessage, requestTotal } from './schema'

interface RequestLinesSectionProps {
  control: Control<PaymentRequestFormValues>
  register: UseFormRegister<PaymentRequestFormValues>
  errors: FieldErrors<PaymentRequestFormValues>
  currencyOptions: Array<{ value: string; label: string }>
  /** Set by the picked purchase order, so it cannot be changed here. */
  currencyLocked: boolean
  /** Invoice requests may split across several expenses; a purchase-order request has one amount. */
  allowMultiple: boolean
  /** The picked PO's open balance, shown and enforced on a purchase-order request. */
  poLimit: PoLimit | null
  costCenters: CostCenterOption[] | undefined
  loadingCostCenters: boolean
  addCostCenterHref: string
  onAddCostCenter: () => void
}

/** Currency, then one or more amounts each booked to an expense (L4 cost center), their total, and remarks. */
export const RequestLinesSection: React.FC<RequestLinesSectionProps> = ({
  control,
  register,
  errors,
  currencyOptions,
  currencyLocked,
  allowMultiple,
  poLimit,
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

  return (
    <Section title="Amount & category" note={allowMultiple ? `split across up to ${MAX_REQUEST_LINES} expenses` : undefined}>
      <FormField
        label="Currency"
        htmlFor="currency"
        required
        className="mb-4 max-w-[12rem]"
        error={errors.currency?.message}
        hint={currencyLocked ? 'Set by the purchase order' : undefined}
      >
        <SelectShell>
          <Select id="currency" className="appearance-none rounded-lg pr-9" disabled={currencyLocked} options={[{ value: '', label: 'Select' }, ...currencyOptions]} {...register('currency')} />
        </SelectShell>
      </FormField>

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
      {typeof errors.lines?.message === 'string' && <p className="mt-2 text-sm text-danger-600">{errors.lines.message}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {allowMultiple ? (
          <span>
            <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => append(emptyLine)}>
              + Add amount
            </Button>
            {full && <span className="ml-2 text-xs text-text-muted">Limit of {MAX_REQUEST_LINES} reached</span>}
          </span>
        ) : (
          <span className="text-xs text-text-muted">{poLimit ? poLimitMessage(poLimit) : null}</span>
        )}
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
