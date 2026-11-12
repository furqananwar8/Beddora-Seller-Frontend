'use client'

import React from 'react'
import { Control, Controller, FieldErrors, UseFormRegister, UseFormSetValue, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import type { CostCenterOption, GstType } from '@/services/api/finance.api'
import { CostCenterField } from '../shared/CostCenterSelect'
import { FormField } from '../shared/FormField'
import { FormSection as Section } from '../shared/FormSection'
import { formatMoney } from '../shared/format'
import { GstRateField, GstTypeField, useGstRates } from '../shared/GstFields'
import { LineColumnHeaders } from '../shared/LineColumnHeaders'
import { GstTotals } from '../shared/GstTotals'
import { SelectShell } from '../shared/SelectShell'
import { DueDateField } from './DueDateField'
import { MAX_REQUEST_LINES, PaymentRequestFormValues, PoLimit, emptyLine, gstInputsOf, parseAmount, poLimitMessage } from './schema'

interface RequestLinesSectionProps {
  control: Control<PaymentRequestFormValues>
  register: UseFormRegister<PaymentRequestFormValues>
  setValue: UseFormSetValue<PaymentRequestFormValues>
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

/** One column grid for the header row and every amount row: currency over the amounts, GST over each amount's GST %, the due date over the expenses. */
const ROW_GRID = 'grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]'
/** The width of the remove button, kept free on rows that have none. */
const REMOVE_SLOT = <span className="hidden w-8 sm:block" />

/** Currency and due date, then one or more amounts each booked to an expense (L4 cost center), their total, and remarks. */
export const RequestLinesSection: React.FC<RequestLinesSectionProps> = ({
  control,
  register,
  setValue,
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
  const gstType = useWatch({ control, name: 'gstType' })
  const { rates: gstRates, onlyRateId } = useGstRates()
  const gstApplies = gstType !== 'NOT_APPLICABLE'
  const full = fields.length >= MAX_REQUEST_LINES
  const several = fields.length > 1

  /** How GST applies is the request's; each amount keeps (or starts with) its own percentage. */
  const changeGstType = (next: GstType) => {
    setValue('gstType', next, { shouldDirty: true, shouldValidate: true })
    lines.forEach((line, index) => setValue(`lines.${index}.gstRateId`, next === 'NOT_APPLICABLE' ? '' : line.gstRateId || onlyRateId, { shouldDirty: true }))
  }
  // A rule on the whole list (the PO cap) lands on `root` of a field array
  const linesError = errors.lines?.message ?? errors.lines?.root?.message

  return (
    <Section title="Amount & category" note={`split across up to ${MAX_REQUEST_LINES} expenses`}>
      <div className={`mb-4 ${ROW_GRID}`}>
        <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message} hint={currencyLockedBy ?? undefined}>
          <SelectShell>
            <Select id="currency" className="appearance-none rounded-lg pr-9" disabled={currencyLockedBy !== null} options={[{ value: '', label: 'Select' }, ...currencyOptions]} {...register('currency')} />
          </SelectShell>
        </FormField>
        <GstTypeField id="request" value={gstType} error={errors.gstType?.message} onChange={changeGstType} />
        <DueDateField control={control} termDays={termDays} />
        {REMOVE_SLOT}
      </div>

      <LineColumnHeaders gridClassName={ROW_GRID} gstApplies={gstApplies} />
      <div className="space-y-3">
        {fields.map((field, index) => {
          const rowErrors = errors.lines?.[index]
          return (
            <div key={field.key} className={ROW_GRID}>
              <FormField label="Amount" labelClassName="sm:sr-only" htmlFor={`lines.${index}.amount`} required error={rowErrors?.amount?.message}>
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
              <GstRateField
                id={`lines.${index}.gstRateId`}
                labelClassName="sm:sr-only"
                applies={gstApplies}
                value={lines[index]?.gstRateId ?? ''}
                error={rowErrors?.gstRateId?.message}
                onChange={(rateId) => setValue(`lines.${index}.gstRateId`, rateId, { shouldDirty: true, shouldValidate: true })}
              />
              <FormField label="Expense" labelClassName="sm:sr-only" htmlFor={`lines.${index}.costCenterId`} required error={rowErrors?.costCenterId?.message}>
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
                  className="mt-6 h-10 w-8 rounded-lg text-lg sm:mt-0 text-text-subtle hover:bg-secondary-100 hover:text-danger-600"
                >
                  ×
                </button>
              ) : (
                REMOVE_SLOT
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
          <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => append({ ...emptyLine, gstRateId: gstApplies ? (lines[lines.length - 1]?.gstRateId ?? onlyRateId) : '' })}>
            + Add amount
          </Button>
          {full && <span className="ml-2 text-xs text-text-muted">Limit of {MAX_REQUEST_LINES} reached</span>}
        </span>
      </div>
      <GstTotals currency={currency} entered={gstInputsOf({ gstType, lines }, gstRates)} type={gstType} />

      <FormField label="Remarks" htmlFor="remarks" className="mt-4" error={errors.remarks?.message}>
        <Textarea id="remarks" rows={2} className="rounded-lg" placeholder="Ocean freight Shanghai to Vancouver, Sep batch." {...register('remarks')} />
      </FormField>
    </Section>
  )
}
