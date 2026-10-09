'use client'

import React from 'react'
import { Control, FieldErrors, UseFormRegister, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { FormSection as Section } from '@/features/finance/shared/FormSection'
import { formatMoney } from '@/features/finance/shared/format'
import { MAX_EXPENSES, PurchaseInvoiceFormValues, emptyExpense, invoiceTotals } from './schema'

interface InvoiceExpensesSectionProps {
  control: Control<PurchaseInvoiceFormValues>
  register: UseFormRegister<PurchaseInvoiceFormValues>
  errors: FieldErrors<PurchaseInvoiceFormValues>
  currency: string
}

/** Charges on top of the goods (poly bags, labels...): Add appends a row of name, remarks and price, up to MAX_EXPENSES. */
export const InvoiceExpensesSection: React.FC<InvoiceExpensesSectionProps> = ({ control, register, errors, currency }) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'expenses', keyName: 'key' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const expenses = useWatch({ control, name: 'expenses' }) ?? []
  const totals = invoiceTotals({ lines, expenses })
  const full = fields.length >= MAX_EXPENSES

  return (
    <Section title="Additional expenses" note={`optional, up to ${MAX_EXPENSES}`}>
      {fields.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="hidden grid-cols-[2fr_3fr_1fr_auto] gap-2 px-1 text-xs font-medium text-text-muted sm:grid">
            <span>Name</span>
            <span>Remarks</span>
            <span className="text-right">Price</span>
            <span className="w-8" />
          </div>
          {fields.map((field, index) => {
            const rowErrors = errors.expenses?.[index]
            return (
              <div key={field.key} className="grid gap-2 sm:grid-cols-[2fr_3fr_1fr_auto] sm:items-start">
                <div>
                  <Input aria-label="Expense name" placeholder="Poly bags" className="rounded-lg" {...register(`expenses.${index}.name`)} />
                  {rowErrors?.name && <p className="mt-1 text-xs text-danger-600">{rowErrors.name.message}</p>}
                </div>
                <div>
                  <Input aria-label="Expense remarks" placeholder="Remarks" className="rounded-lg" {...register(`expenses.${index}.remarks`)} />
                  {rowErrors?.remarks && <p className="mt-1 text-xs text-danger-600">{rowErrors.remarks.message}</p>}
                </div>
                <div>
                  <Input aria-label="Expense price" inputMode="decimal" placeholder="0.00" className="rounded-lg text-right" {...register(`expenses.${index}.amount`)} />
                  {rowErrors?.amount && <p className="mt-1 text-xs text-danger-600">{rowErrors.amount.message}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Remove expense ${index + 1}`}
                  onClick={() => remove(index)}
                  className="h-10 w-8 rounded-lg text-lg text-text-subtle hover:bg-secondary-100 hover:text-danger-600"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => append(emptyExpense)}>
        + Add
      </Button>
      {full && <span className="ml-2 text-xs text-text-muted">Limit of {MAX_EXPENSES} reached</span>}

      <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-text-secondary">
          <dt>Invoiced items</dt>
          <dd className="tabular-nums">{formatMoney(totals.invoice)}</dd>
        </div>
        <div className="flex justify-between text-text-secondary">
          <dt>Additional expenses</dt>
          <dd className="tabular-nums">{formatMoney(totals.expenses)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-text-primary">
          <dt>Invoice total</dt>
          <dd className="tabular-nums">
            {currency} {formatMoney(totals.amount)}
          </dd>
        </div>
      </dl>
    </Section>
  )
}
