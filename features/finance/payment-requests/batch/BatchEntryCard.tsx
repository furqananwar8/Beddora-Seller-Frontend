'use client'

import React from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import type { CostCenterOption, GstType, Marketplace, PartnerOption, ReferenceType } from '@/services/api/finance.api'
import { CostCenterField } from '../../shared/CostCenterSelect'
import { FormField } from '../../shared/FormField'
import { currencyOptions } from '../../shared/currency'
import { formatMoney } from '../../shared/format'
import { GstRateField, GstTypeField, useGstRates } from '../../shared/GstFields'
import { LineColumnHeaders } from '../../shared/LineColumnHeaders'
import { GstTotals } from '../../shared/GstTotals'
import { SelectShell } from '../../shared/SelectShell'
import { CarrierShipmentSelect } from '../CarrierShipmentSelect'
import { ContainerSelect, containerRefOf } from '../ContainerSelect'
import { PayableInvoiceSelect } from '../PayableInvoiceSelect'
import { PayablePoSelect } from '../PayablePoSelect'
import { MAX_REQUEST_LINES, REFERENCE_OPTIONS, emptyLine, gstInputsOf, parseAmount } from '../schema'
import type { BatchFormValues } from './batchSchema'

/** The column grid of an amount row (and of the labels above the rows). */
const LINE_GRID = 'grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]'

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
  const { rates: gstRates, onlyRateId } = useGstRates()
  const gstType: GstType = entry?.gstType ?? 'NOT_APPLICABLE'
  const gstApplies = gstType !== 'NOT_APPLICABLE'
  const byPurchaseOrder = entry?.referenceType === 'PURCHASE_ORDER'
  const several = fields.length > 1
  const linesError = errors?.lines?.message ?? errors?.lines?.root?.message

  const applyDestination = (code: string) => {
    const destination = marketplaces?.find((marketplace) => marketplace.code === code)
    if (destination) setValue(`${prefix}.marketplaceId`, String(destination.id), { shouldDirty: true })
  }

  /** How GST applies is the request's; each amount keeps (or starts with) its own percentage. */
  const changeGstType = (next: GstType) => {
    setValue(`${prefix}.gstType`, next, { shouldDirty: true, shouldValidate: true })
    ;(entry?.lines ?? []).forEach((line, index) => setValue(`${prefix}.lines.${index}.gstRateId`, next === 'NOT_APPLICABLE' ? '' : line.gstRateId || onlyRateId, { shouldDirty: true }))
  }

  const switchReference = (next: ReferenceType) => {
    setValue(`${prefix}.referenceType`, next, { shouldDirty: true })
    // A PO request has no invoice number; invoice and shipment requests have no PO; only shipment requests carry shipments
    if (next === 'PURCHASE_ORDER') setValue(`${prefix}.invoiceNo`, '')
    else setValue(`${prefix}.purchaseOrder`, null)
    if (next !== 'SHIPMENT') setValue(`${prefix}.shipments`, [])
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Request {index + 1}</h3>
        <SegmentedToggle<ReferenceType> ariaLabel={`Request ${index + 1} paying against`} value={entry?.referenceType ?? 'INVOICE'} onChange={switchReference} options={REFERENCE_OPTIONS} />
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
        {entry?.referenceType === 'SHIPMENT' && (
          <FormField
            label="Shipment No"
            htmlFor={`${prefix}.shipments`}
            required
            error={errors?.shipments?.message as string | undefined}
            hint="FBA shipments booked with this carrier; one invoice may cover several"
            className="sm:col-span-2 lg:col-span-4"
          >
            <Controller
              control={control}
              name={`${prefix}.shipments`}
              render={({ field }) => (
                <CarrierShipmentSelect id={`${prefix}.shipments`} partnerId={partner?.id ?? null} value={field.value} onChange={field.onChange} error={errors?.shipments?.message as string | undefined} />
              )}
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
        <GstTypeField id={prefix} value={gstType} error={errors?.gstType?.message} onChange={changeGstType} />
      </div>

      <div className="mt-4">
        <LineColumnHeaders gridClassName={LINE_GRID} gstApplies={gstApplies} />
      </div>
      <div className="space-y-3">
        {fields.map((field, lineIndex) => {
          const lineErrors = errors?.lines?.[lineIndex]
          return (
            <div key={field.key} className={LINE_GRID}>
              <FormField label="Amount" labelClassName="sm:sr-only" htmlFor={`${prefix}.lines.${lineIndex}.amount`} required error={lineErrors?.amount?.message}>
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
              <GstRateField id={`${prefix}.lines.${lineIndex}.gstRateId`} labelClassName="sm:sr-only" applies={gstApplies} error={lineErrors?.gstRateId?.message} onAdded={(rateId) => setValue(`${prefix}.lines.${lineIndex}.gstRateId`, rateId, { shouldDirty: true, shouldValidate: true })}>
                {({ options, disabled }) => <Select id={`${prefix}.lines.${lineIndex}.gstRateId`} className="appearance-none rounded-lg pr-9" disabled={disabled} options={options} {...register(`${prefix}.lines.${lineIndex}.gstRateId`)} />}
              </GstRateField>
              <FormField label="Expense" labelClassName="sm:sr-only" htmlFor={`${prefix}.lines.${lineIndex}.costCenterId`} required error={lineErrors?.costCenterId?.message}>
                <CostCenterField control={control} name={`${prefix}.lines.${lineIndex}.costCenterId`} id={`${prefix}.lines.${lineIndex}.costCenterId`} options={costCenters} loading={loadingCostCenters} addHref={COST_CENTER_ADD_HREF} />
              </FormField>
              {several ? (
                <button type="button" aria-label={`Remove amount ${lineIndex + 1}`} onClick={() => remove(lineIndex)} className="mt-6 h-10 w-8 rounded-lg text-lg sm:mt-0 text-text-subtle hover:bg-secondary-100 hover:text-danger-600">
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
        <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_REQUEST_LINES} onClick={() => append({ ...emptyLine, gstRateId: gstApplies ? (entry?.lines?.[entry.lines.length - 1]?.gstRateId ?? onlyRateId) : '' })}>
          + Add amount
        </Button>
      </div>
      <GstTotals
        currency={entry?.currency ?? ''}
        entered={gstInputsOf({ gstType, lines: entry?.lines ?? [] }, gstRates)}
        type={gstType}
      />

      <FormField label="Remarks" htmlFor={`${prefix}.remarks`} className="mt-4" error={errors?.remarks?.message}>
        <Textarea id={`${prefix}.remarks`} rows={1} className="rounded-lg" {...register(`${prefix}.remarks`)} />
      </FormField>
    </div>
  )
}
