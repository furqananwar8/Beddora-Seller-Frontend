'use client'

import React from 'react'
import { Control, FieldErrors, UseFormRegister, useFieldArray, useWatch } from 'react-hook-form'
import { Input } from '@/design-system/inputs'
import { FormSection as Section } from '@/features/finance/shared/FormSection'
import { formatMoney } from '@/features/finance/shared/format'
import { cn } from '@/utils/cn'
import { InvoiceLineValues, PurchaseInvoiceFormValues, invoiceTotals, lineAmount, poLineAmount } from './schema'

interface InvoiceItemsSectionProps {
  control: Control<PurchaseInvoiceFormValues>
  register: UseFormRegister<PurchaseInvoiceFormValues>
  errors: FieldErrors<PurchaseInvoiceFormValues>
  currency: string
  /** Shown on the right of the bars, like the PDF: the PO number and the supplier's invoice number. */
  poNo: string
  invoiceNo: string
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_90px_90px_110px] items-center gap-3'
const NUM = 'text-right tabular-nums'
const qty = (value: number) => value.toLocaleString('en-CA')

/** A titled bar over each table, with a reference on its right (the PDF's yellow bars). */
const Bar: React.FC<{ title: string; reference?: string }> = ({ title, reference }) => (
  <div className="relative rounded-md bg-warning-100 px-3 py-1.5 text-center text-sm font-semibold text-text-primary">
    {title}
    {reference && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">{reference}</span>}
  </div>
)

const Head: React.FC = () => (
  <div className={cn(COLS, 'border-b border-border px-1 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted')}>
    <span>Item</span>
    <span className={NUM}>Qty</span>
    <span className={NUM}>Rate</span>
    <span className={NUM}>Amount</span>
  </div>
)

const ItemName: React.FC<{ line: Pick<InvoiceLineValues, 'ref' | 'label'> }> = ({ line }) => (
  <span className="min-w-0">
    <span className="mr-2 font-mono text-xs text-text-muted">{line.ref}</span>
    <span className="text-sm text-text-primary">{line.label}</span>
  </span>
)

/** The total under the Amount column, double-ruled as on the PDF. */
const Total: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className={cn(COLS, 'px-1 pt-2')}>
    <span className="text-sm font-semibold text-text-primary">{label}</span>
    <span />
    <span />
    <span className={cn(NUM, 'border-y-[3px] border-double border-text-primary py-1 text-sm font-bold')}>{formatMoney(value)}</span>
  </div>
)

/**
 * As on the PDF: the purchase order as ordered (read only), then the invoice as the supplier billed it, where the
 * quantity and rate start at the PO's and are changed when more or less arrived or the price moved.
 */
export const InvoiceItemsSection: React.FC<InvoiceItemsSectionProps> = ({ control, register, errors, currency, poNo, invoiceNo }) => {
  const { fields } = useFieldArray({ control, name: 'lines', keyName: 'key' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const totals = invoiceTotals({ lines, expenses: [] })
  const rowError = (index: number) => errors.lines?.[index]?.units?.message ?? errors.lines?.[index]?.unitPrice?.message

  return (
    <Section title="Items" note="the purchase order's SKUs; enter what the supplier actually invoiced">
      <div className="overflow-x-auto">
        <div className="min-w-[560px] space-y-6">
          <div>
            <Bar title="Purchase order" reference={poNo} />
            <Head />
            {fields.map((field) => (
              <div key={field.key} className={cn(COLS, 'border-b border-border/60 px-1 py-2.5')}>
                <ItemName line={field} />
                <span className={cn(NUM, 'text-sm')}>{qty(field.poUnits)}</span>
                <span className={cn(NUM, 'text-sm')}>{formatMoney(field.poUnitPrice)}</span>
                <span className={cn(NUM, 'text-sm')}>{formatMoney(poLineAmount(field))}</span>
              </div>
            ))}
            <Total value={totals.po} label={`Total (${currency || '—'})`} />
          </div>

          <div>
            <Bar title="Invoice" reference={invoiceNo.trim() || undefined} />
            <Head />
            {fields.map((field, index) => {
              const line = lines[index] ?? field
              const changed = line.units.trim() !== String(field.poUnits) || Number(line.unitPrice) !== field.poUnitPrice
              return (
                <div key={field.key} className={cn('border-b border-border/60 px-1 py-2', changed && 'bg-warning-50/60')}>
                  <div className={COLS}>
                    <ItemName line={field} />
                    <Input aria-label={`Invoiced quantity of ${field.ref}`} inputMode="numeric" autoComplete="off" className="h-9 rounded-lg text-right" {...register(`lines.${index}.units`)} />
                    <Input aria-label={`Invoiced rate of ${field.ref}`} inputMode="decimal" autoComplete="off" className="h-9 rounded-lg text-right" {...register(`lines.${index}.unitPrice`)} />
                    <span className={cn(NUM, 'text-sm font-medium')}>{formatMoney(lineAmount(line))}</span>
                  </div>
                  {rowError(index) && <p className="mt-1 text-right text-xs text-danger-600">{rowError(index)}</p>}
                </div>
              )
            })}
            <Total value={totals.invoice} label={`Total (${currency || '—'})`} />
          </div>
        </div>
      </div>
      {typeof errors.lines?.message === 'string' && <p className="mt-2 text-sm text-danger-600">{errors.lines.message}</p>}
    </Section>
  )
}
