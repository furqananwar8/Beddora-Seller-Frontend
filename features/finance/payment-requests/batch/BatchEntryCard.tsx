'use client'

import React from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import type { CostCenterOption, Marketplace, PartnerOption, ReferenceType } from '@/services/api/finance.api'
import { CostCenterField } from '../../shared/CostCenterSelect'
import { FormField } from '../../shared/FormField'
import { currencyOptions } from '../../shared/currency'
import { formatCurrencyAmount, formatMoney } from '../../shared/format'
import { SelectShell } from '../../shared/SelectShell'
import { ContainerSelect, containerRefOf } from '../ContainerSelect'
import { PayableInvoiceSelect } from '../PayableInvoiceSelect'
import { PayablePoSelect } from '../PayablePoSelect'
import { MAX_REQUEST_LINES, REFERENCE_OPTIONS, emptyLine, parseAmount, requestTotal } from '../schema'
import type { BatchFormValues } from './batchSchema'

/** Batches pay invoices and purchase orders; shipment requests stay one at a time. */
const BATCH_REFERENCE_OPTIONS = REFERENCE_OPTIONS.filter((option) => option.value !== 'SHIPMENT')

const COST_CENTER_ADD_HREF = `/dashboard/finance/cost-center/new?returnTo=${encodeURIComponent('/dashboard/finance/payment-request/new')}`

interface BatchEntryCardProps {
  form: UseFormReturn<BatchFormValues>
  index: number
  partner: PartnerOption | null
  costCenters: CostCenterOption[] | undefined
  loadingCostCenters: boolean
  marketplaces: Marketplace[] | undefined
  /** Null when this is the only request (it cannot be removed). */
  onRemove: (() => void) | null
}

/** One request of the batch: what it pays, dates, container, currency, its amounts and remarks. */
export const BatchEntryCard: React.FC<BatchEntryCardProps> = ({ form, index, partner, costCenters, loadingCostCenters, marketplaces, onRemove }) => {
  const { control, register, setValue, formState } = form
  const prefix = `entries.${index}` as const
  const errors = formState.errors.entries?.[index]
  const { fields, append, remove } = useFieldArray({ control, name: `${prefix}.lines`, keyName: 'key' })
  const entry = useWatch({ control, name: prefix })
  const byPurchaseOrder = entry?.referenceType === 'PURCHASE_ORDER'
  const several = fields.length > 1
  const linesError = errors?.lines?.message ?? errors?.lines?.root?.message

  const applyDestination = (code: string) => {
    const destination = marketplaces?.find((marketplace) => marketplace.code === code)
    if (destination) setValue(`${prefix}.marketplaceId`, String(destination.id), { shouldDirty: true })
  }

  const switchReference = (next: ReferenceType) => {
    setValue(`${prefix}.referenceType`, next === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER' : 'INVOICE', { shouldDirty: true })
    if (next === 'PURCHASE_ORDER') setValue(`${prefix}.invoiceNo`, '')
    else setValue(`${prefix}.purchaseOrder`, null)
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Request {index + 1}</h3>
        <SegmentedToggle<ReferenceType> ariaLabel={`Request ${index + 1} paying against`} value={entry?.referenceType ?? 'INVOICE'} onChange={switchReference} options={BATCH_REFERENCE_OPTIONS} />
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove request ${index + 1}`} className="ml-auto rounded-lg px-2 py-1 text-sm text-text-subtle hover:bg-secondary-100 hover:text-danger-600">
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {byPurchaseOrder ? (
          <FormField label="Purchase order" htmlFor={`${prefix}.purchaseOrder`} required error={errors?.purchaseOrder?.message as string | undefined} className="lg:col-span-2">
            <PayablePoSelect
              id={`${prefix}.purchaseOrder`}
              partnerId={partner?.id ?? null}
              value={entry?.purchaseOrder ?? null}
              error={errors?.purchaseOrder?.message as string | undefined}
              onChange={(po) => {
                setValue(`${prefix}.purchaseOrder`, { id: po.id, poNo: po.poNo }, { shouldValidate: true, shouldDirty: true })
                setValue(`${prefix}.currency`, po.currency, { shouldValidate: true })
                applyDestination(po.destination)
              }}
            />
          </FormField>
        ) : (
          <FormField label="Invoice No" htmlFor={`${prefix}.invoiceNo`} required error={errors?.invoiceNo?.message} className="lg:col-span-2">
            <PayableInvoiceSelect
              id={`${prefix}.invoiceNo`}
              partnerId={partner?.id ?? null}
              value={entry?.invoiceNo ?? ''}
              error={errors?.invoiceNo?.message}
              onPick={(invoice) => {
                setValue(`${prefix}.invoiceNo`, invoice.invoiceNo, { shouldValidate: true, shouldDirty: true })
                setValue(`${prefix}.currency`, invoice.currency, { shouldValidate: true })
                setValue(`${prefix}.marketplaceId`, invoice.marketplaceId ? String(invoice.marketplaceId) : '')
              }}
              onOther={(invoiceNo) => setValue(`${prefix}.invoiceNo`, invoiceNo, { shouldValidate: true, shouldDirty: true })}
            />
          </FormField>
        )}
        <FormField label={byPurchaseOrder ? 'Date' : 'Invoice Date'} htmlFor={`${prefix}.invoiceDate`} required error={errors?.invoiceDate?.message}>
          <Controller control={control} name={`${prefix}.invoiceDate`} render={({ field }) => <SingleDatePicker id={`${prefix}.invoiceDate`} value={field.value} onChange={field.onChange} error={errors?.invoiceDate?.message} />} />
        </FormField>
        <FormField label="Due Date" htmlFor={`${prefix}.dueDate`} error={errors?.dueDate?.message} hint={partner?.paymentTermDays ? `Left empty: invoice date + ${partner.paymentTermDays} days` : undefined}>
          <Controller control={control} name={`${prefix}.dueDate`} render={({ field }) => <SingleDatePicker id={`${prefix}.dueDate`} value={field.value} onChange={field.onChange} error={errors?.dueDate?.message} />} />
        </FormField>
        <FormField label="Container #" htmlFor={`${prefix}.containerNo`} error={errors?.containerNo?.message} className="lg:col-span-2">
          <ContainerSelect
            id={`${prefix}.containerNo`}
            value={entry?.containerNo ?? ''}
            error={errors?.containerNo?.message}
            onChange={(container) => {
              setValue(`${prefix}.containerNo`, container ? containerRefOf(container) : '', { shouldValidate: true, shouldDirty: true })
              if (container) applyDestination(container.destination)
            }}
          />
        </FormField>
        <FormField label="Currency" htmlFor={`${prefix}.currency`} required error={errors?.currency?.message}>
          <SelectShell>
            <Select id={`${prefix}.currency`} className="appearance-none rounded-lg pr-9" options={[{ value: '', label: 'Select' }, ...currencyOptions(entry?.currency ?? '')]} {...register(`${prefix}.currency`)} />
          </SelectShell>
        </FormField>
      </div>

      <div className="mt-4 space-y-3">
        {fields.map((field, lineIndex) => {
          const lineErrors = errors?.lines?.[lineIndex]
          return (
            <div key={field.key} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
              <FormField label={several ? `Amount ${lineIndex + 1}` : 'Amount'} htmlFor={`${prefix}.lines.${lineIndex}.amount`} required error={lineErrors?.amount?.message}>
                <Controller
                  control={control}
                  name={`${prefix}.lines.${lineIndex}.amount`}
                  render={({ field: amount }) => (
                    <Input
                      id={`${prefix}.lines.${lineIndex}.amount`}
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
              <FormField label="Expense" htmlFor={`${prefix}.lines.${lineIndex}.costCenterId`} required error={lineErrors?.costCenterId?.message}>
                <CostCenterField control={control} name={`${prefix}.lines.${lineIndex}.costCenterId`} id={`${prefix}.lines.${lineIndex}.costCenterId`} options={costCenters} loading={loadingCostCenters} addHref={COST_CENTER_ADD_HREF} />
              </FormField>
              {several ? (
                <button type="button" aria-label={`Remove amount ${lineIndex + 1}`} onClick={() => remove(lineIndex)} className="mt-6 h-10 w-8 rounded-lg text-lg text-text-subtle hover:bg-secondary-100 hover:text-danger-600">
                  ×
                </button>
              ) : (
                <span className="hidden w-8 sm:block" />
              )}
            </div>
          )
        })}
      </div>
      {linesError && <p className="mt-2 text-sm text-danger-600">{linesError}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_REQUEST_LINES} onClick={() => append(emptyLine)}>
          + Add amount
        </Button>
        {several && <span className="text-sm font-semibold text-text-primary">Total {formatCurrencyAmount(entry?.currency || '—', requestTotal(entry?.lines ?? []))}</span>}
      </div>

      <FormField label="Remarks" htmlFor={`${prefix}.remarks`} className="mt-4" error={errors?.remarks?.message}>
        <Textarea id={`${prefix}.remarks`} rows={1} className="rounded-lg" {...register(`${prefix}.remarks`)} />
      </FormField>
    </div>
  )
}
