'use client'

import React, { useState } from 'react'
import { Control, FieldErrors, UseFormRegister, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'
import { CostCenterField, type CostCenterSource } from '@/features/finance/shared/CostCenterSelect'
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
  /** Each item is booked to its own expense. */
  costCenters: CostCenterSource
}

const PO_COLS = 'grid grid-cols-[minmax(0,1fr)_90px_90px_110px] items-center gap-3'
const INVOICE_COLS = 'grid grid-cols-[minmax(0,1fr)_90px_90px_110px_minmax(180px,1fr)] items-start gap-3'
const NUM = 'text-right tabular-nums'
const qty = (value: number) => value.toLocaleString('en-CA')

/** A titled bar over each table, with a reference on its right (the PDF's yellow bars). */
const Bar: React.FC<{ title: string; reference?: string }> = ({ title, reference }) => (
  <div className="relative rounded-md bg-warning-100 px-3 py-1.5 text-center text-sm font-semibold text-text-primary">
    {title}
    {reference && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">{reference}</span>}
  </div>
)

const Head: React.FC<{ cols: string; withExpense?: boolean }> = ({ cols, withExpense }) => (
  <div className={cn(cols, 'border-b border-border px-1 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted')}>
    <span>Item</span>
    <span className={NUM}>Qty</span>
    <span className={NUM}>Rate</span>
    <span className={NUM}>Amount</span>
    {withExpense && <span>Expense</span>}
  </div>
)

const ItemName: React.FC<{ line: Pick<InvoiceLineValues, 'ref' | 'label'> }> = ({ line }) => (
  <span className="min-w-0">
    <span className="mr-2 font-mono text-xs text-text-muted">{line.ref}</span>
    <span className="text-sm text-text-primary">{line.label}</span>
  </span>
)

/** The total under the Amount column, double-ruled as on the PDF. */
const Total: React.FC<{ cols: string; value: number; label: string }> = ({ cols, value, label }) => (
  <div className={cn(cols, 'px-1 pt-2')}>
    <span className="text-sm font-semibold text-text-primary">{label}</span>
    <span />
    <span />
    <span className={cn(NUM, 'border-y-[3px] border-double border-text-primary py-1 text-sm font-bold')}>{formatMoney(value)}</span>
  </div>
)

/** The purchase order as ordered (read only), shown on demand in a modal. */
const PurchaseOrderTable: React.FC<{ lines: InvoiceLineValues[]; poNo: string; currency: string }> = ({ lines, poNo, currency }) => (
  <div className="overflow-x-auto">
    <div className="min-w-[480px]">
      <Bar title="Purchase order" reference={poNo} />
      <Head cols={PO_COLS} />
      {lines.map((line) => (
        <div key={line.productId} className={cn(PO_COLS, 'border-b border-border/60 px-1 py-2.5')}>
          <ItemName line={line} />
          <span className={cn(NUM, 'text-sm')}>{qty(line.poUnits)}</span>
          <span className={cn(NUM, 'text-sm')}>{formatMoney(line.poUnitPrice)}</span>
          <span className={cn(NUM, 'text-sm')}>{formatMoney(poLineAmount(line))}</span>
        </div>
      ))}
      <Total cols={PO_COLS} value={invoiceTotals({ lines, expenses: [] }).po} label={`Total (${currency || '—'})`} />
    </div>
  </div>
)

/**
 * The invoice as the supplier billed it: quantity and rate start at the PO's and are changed when more or less
 * arrived or the price moved; each item is booked to an expense. The PO as ordered opens in a modal.
 */
export const InvoiceItemsSection: React.FC<InvoiceItemsSectionProps> = ({ control, register, errors, currency, poNo, invoiceNo, costCenters }) => {
  const [showPo, setShowPo] = useState(false)
  const { fields } = useFieldArray({ control, name: 'lines', keyName: 'key' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const totals = invoiceTotals({ lines, expenses: [] })
  const rowError = (index: number) => errors.lines?.[index]?.units?.message ?? errors.lines?.[index]?.unitPrice?.message ?? errors.lines?.[index]?.costCenterId?.message

  return (
    <Section title="Items" note="the purchase order's SKUs; enter what the supplier actually invoiced">
      <div className="mb-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPo(true)}>
          View purchase order
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <Bar title="Invoice" reference={invoiceNo.trim() || undefined} />
          <Head cols={INVOICE_COLS} withExpense />
          {fields.map((field, index) => {
            const line = lines[index] ?? field
            const changed = line.units.trim() !== String(field.poUnits) || Number(line.unitPrice) !== field.poUnitPrice
            return (
              <div key={field.key} className={cn('border-b border-border/60 px-1 py-2', changed && 'bg-warning-50/60')}>
                <div className={INVOICE_COLS}>
                  <span className="pt-2">
                    <ItemName line={field} />
                  </span>
                  <Input aria-label={`Invoiced quantity of ${field.ref}`} inputMode="numeric" autoComplete="off" className="h-9 rounded-lg text-right" {...register(`lines.${index}.units`)} />
                  <Input aria-label={`Invoiced rate of ${field.ref}`} inputMode="decimal" autoComplete="off" className="h-9 rounded-lg text-right" {...register(`lines.${index}.unitPrice`)} />
                  <span className={cn(NUM, 'pt-2 text-sm font-medium')}>{formatMoney(lineAmount(line))}</span>
                  <CostCenterField control={control} name={`lines.${index}.costCenterId`} id={`lines.${index}.costCenterId`} {...costCenters} />
                </div>
                {rowError(index) && <p className="mt-1 text-right text-xs text-danger-600">{rowError(index)}</p>}
              </div>
            )
          })}
          <Total cols={INVOICE_COLS} value={totals.invoice} label={`Total (${currency || '—'})`} />
        </div>
      </div>
      {typeof errors.lines?.message === 'string' && <p className="mt-2 text-sm text-danger-600">{errors.lines.message}</p>}

      <Modal isOpen={showPo} onClose={() => setShowPo(false)} title={`Purchase order ${poNo}`} size="lg" closeOnEscape closeOnBackdropClick>
        <PurchaseOrderTable lines={lines} poNo={poNo} currency={currency} />
      </Modal>
    </Section>
  )
}
