'use client'

import React, { useEffect } from 'react'
import { Control, Controller, FieldErrors, UseFormRegister, UseFormSetValue, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { Select, Textarea } from '@/design-system/inputs'
import type { CostCenterOption, GstType } from '@/services/api/finance.api'
import { AmountInput } from '../shared/AmountInput'
import { CostCenterField } from '../shared/CostCenterSelect'
import { FormField } from '../shared/FormField'
import { FormSection as Section } from '../shared/FormSection'
import { formatMoney } from '../shared/format'
import { distributeGst } from '../shared/gst'
import { GstRateField, GstTypeField, useGstRates } from '../shared/GstFields'
import { LineColumnHeaders } from '../shared/LineColumnHeaders'
import { GstTotals } from '../shared/GstTotals'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { DueDateField } from './DueDateField'
import { PoPercentAmountInput } from './PoPercentAmountInput'
import { MAX_REQUEST_LINES, PaymentRequestFormValues, PoLimit, autoGstText, emptyLine, gstInputsOf, parseAmount, poLimitMessage } from './schema'

interface RequestLinesSectionProps {
  control: Control<PaymentRequestFormValues>
  register: UseFormRegister<PaymentRequestFormValues>
  setValue: UseFormSetValue<PaymentRequestFormValues>
  errors: FieldErrors<PaymentRequestFormValues>
  currencyOptions: Array<{ value: string; label: string }>
  /** What set the currency (the picked purchase order or invoice), so it cannot be changed here; null when free. */
  currencyLockedBy: string | null
  /** Paying against a purchase order: each amount can be typed as a % of the PO's total, whether or not a PO is picked yet. */
  byPurchaseOrder: boolean
  /** The picked PO's open balance, shown and enforced on the total of a purchase-order request; null until one is picked. */
  poLimit: PoLimit | null
  /** The partner's payment term, which sets the due date. */
  termDays: number | null
  costCenters: CostCenterOption[] | undefined
  loadingCostCenters: boolean
  addCostCenterHref: string
  onAddCostCenter: () => void
}

/** One column grid for the header row and every amount row: currency over the amounts, GST over each amount's GST %, the due date over its GST amount and expense. */
/**
 * One grid for every row of this section: Currency sits over Amount, GST over GST %, and Due date runs over GST amount
 * and Expense. The second and third columns are a little wider so GST fits "Not applicable".
 */
const ROW_GRID = 'grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,2fr)_auto]'
/** A purchase-order request has a percentage box beside each amount, so the first column is wider (written out whole so Tailwind sees it). */
const ROW_GRID_WITH_PERCENT = 'grid items-start gap-3 sm:grid-cols-[minmax(0,1.9fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,2fr)_auto]'
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
  byPurchaseOrder,
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
  const rowGrid = byPurchaseOrder ? ROW_GRID_WITH_PERCENT : ROW_GRID

  /** How GST applies is the request's; each amount keeps (or starts with) its own percentage. */
  const changeGstType = (next: GstType) => {
    setValue('gstType', next, { shouldDirty: true, shouldValidate: true })
    lines.forEach((line, index) => {
      setValue(`lines.${index}.gstRateId`, next === 'NOT_APPLICABLE' ? '' : line.gstRateId || onlyRateId, { shouldDirty: true })
      setValue(`lines.${index}.gstManual`, false)
    })
  }

  // Until typed over, each amount's GST follows its amount, percentage and the GST type
  useEffect(() => {
    lines.forEach((line, index) => {
      if (line.gstManual) return
      const rate = gstRates.find((candidate) => String(candidate.id) === line.gstRateId)?.rate ?? null
      const want = autoGstText(line.amount, rate, gstType)
      if (line.gstAmount !== want) setValue(`lines.${index}.gstAmount`, want)
    })
  }, [lines, gstRates, gstType, setValue])

  const typeLineGst = (index: number, text: string) => {
    setValue(`lines.${index}.gstAmount`, text, { shouldDirty: true, shouldValidate: true })
    // Emptied again: back to working it out
    setValue(`lines.${index}.gstManual`, text.trim() !== '')
  }

  /** A total GST typed in is spread over the amounts, which then hold it as typed. */
  const typeTotalGst = (text: string) => {
    const shares = distributeGst(parseAmount(text) || 0, gstInputsOf({ gstType, lines }, gstRates), gstType)
    shares.forEach((share, index) => {
      setValue(`lines.${index}.gstAmount`, formatMoney(share), { shouldDirty: true, shouldValidate: true })
      setValue(`lines.${index}.gstManual`, true)
    })
  }
  // A rule on the whole list (the PO cap) lands on `root` of a field array
  const linesError = errors.lines?.message ?? errors.lines?.root?.message

  return (
    <Section title="Amount & category" note={`split across up to ${MAX_REQUEST_LINES} expenses`}>
      <div className={`mb-4 ${rowGrid}`}>
        <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message} hint={currencyLockedBy ?? undefined}>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => <ChoiceSelect id="currency" title="Currency" value={field.value} onChange={field.onChange} options={[{ value: '', label: 'Select' }, ...currencyOptions]} disabled={currencyLockedBy !== null} />}
          />
        </FormField>
        <GstTypeField id="request" value={gstType} error={errors.gstType?.message} onChange={changeGstType} />
        {/* Runs over the GST amount and Expense columns, so the row ends where the amount rows do */}
        <div className="sm:col-span-2">
          <DueDateField control={control} termDays={termDays} />
        </div>
        {REMOVE_SLOT}
      </div>

      <LineColumnHeaders gridClassName={rowGrid} gstApplies={gstApplies} showGstAmount showPercent={byPurchaseOrder} />
      <div className="space-y-3">
        {fields.map((field, index) => {
          const rowErrors = errors.lines?.[index]
          return (
            <div key={field.key} className={rowGrid}>
              <FormField label="Amount" labelClassName="sm:sr-only" htmlFor={`lines.${index}.amount`} required error={rowErrors?.amount?.message ?? rowErrors?.percent?.message}>
                <Controller
                  control={control}
                  name={`lines.${index}.amount`}
                  render={({ field: amount }) => {
                    const amountProps = {
                      id: `lines.${index}.amount`,
                      placeholder: '0.00',
                      className: 'rounded-lg text-right',
                      value: amount.value,
                      onValueChange: (text: string) => {
                        amount.onChange(text)
                        setValue(`lines.${index}.gstManual`, false)
                      },
                      onBlur: amount.onBlur,
                    }
                    // A purchase-order request may also be typed as a share of the PO's total
                    return byPurchaseOrder ? (
                      <PoPercentAmountInput
                        {...amountProps}
                        ref={amount.ref}
                        poTotal={poLimit?.amount ?? 0}
                        percent={lines[index]?.percent ?? ''}
                        onPercentChange={(text) => setValue(`lines.${index}.percent`, text, { shouldDirty: true })}
                      />
                    ) : (
                      <AmountInput {...amountProps} ref={amount.ref} />
                    )
                  }}
                />
              </FormField>
              <GstRateField
                id={`lines.${index}.gstRateId`}
                labelClassName="sm:sr-only"
                applies={gstApplies}
                value={lines[index]?.gstRateId ?? ''}
                error={rowErrors?.gstRateId?.message}
                onChange={(rateId) => {
                  setValue(`lines.${index}.gstRateId`, rateId, { shouldDirty: true, shouldValidate: true })
                  setValue(`lines.${index}.gstManual`, false)
                }}
              />
              <FormField label="GST amount" labelClassName="sm:sr-only" htmlFor={`lines.${index}.gstAmount`} error={rowErrors?.gstAmount?.message}>
                <AmountInput
                  id={`lines.${index}.gstAmount`}
                  placeholder={gstApplies ? '0.00' : '—'}
                  disabled={!gstApplies}
                  className="rounded-lg text-right"
                  value={lines[index]?.gstAmount ?? ''}
                  onValueChange={(text) => typeLineGst(index, text)}
                />
              </FormField>
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
      <GstTotals currency={currency} entered={gstInputsOf({ gstType, lines }, gstRates)} type={gstType} onGstChange={typeTotalGst} />

      <FormField label="Remarks" htmlFor="remarks" className="mt-4" error={errors.remarks?.message}>
        <Textarea id="remarks" rows={2} className="rounded-lg" placeholder="Ocean freight Shanghai to Vancouver, Sep batch." {...register('remarks')} />
      </FormField>
    </Section>
  )
}
