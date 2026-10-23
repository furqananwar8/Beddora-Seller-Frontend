'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount, formatMoney } from '@/features/finance/shared/format'
import { useGetContainerCostDetailQuery, type ContainerCostItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { costColumns } from './costColumns'
import { PoCostTable } from './PoCostTable'

const Chip: React.FC<{ tone?: 'neutral' | 'warning'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={cn('rounded-full border px-2.5 py-1 text-xs', tone === 'warning' ? 'border-warning-200 bg-warning-50 text-warning-700' : 'border-border bg-surface text-text-secondary')}>{children}</span>
)

/** What was paid per expense, and anything that is not in the figures yet (pending, unsplit, other currencies). */
const ExpenseChips: React.FC<{ container: ContainerCostItem }> = ({ container }) => {
  const { expenses, otherExpenses, currencies } = container
  return (
    <div className="flex flex-wrap gap-2">
      {expenses.map((expense) => (
        <Chip key={expense.key}>
          {expense.label} <span className="font-semibold tabular-nums text-text-primary">{formatMoney(expense.paid)}</span>
        </Chip>
      ))}
      {expenses
        .filter((expense) => !expense.mapped)
        .map((expense) => (
          <Chip key={`${expense.key}-unmapped`} tone="warning">
            {expense.label}: not mapped to an L4 cost center
          </Chip>
        ))}
      {expenses
        .filter((expense) => expense.pending > 0)
        .map((expense) => (
          <Chip key={`${expense.key}-pending`} tone="warning">
            {expense.label}: {formatMoney(expense.pending)} awaiting approval
          </Chip>
        ))}
      {expenses
        .filter((expense) => expense.unallocated > 0)
        .map((expense) => (
          <Chip key={`${expense.key}-unallocated`} tone="warning">
            {expense.label}: {formatMoney(expense.unallocated)} not split (no {expense.basis === 'cbm' ? 'CBM' : 'value'} on the packaging list)
          </Chip>
        ))}
      {otherExpenses.approved + otherExpenses.pending > 0 && <Chip tone="warning">Other payments not in the analysis: {formatMoney(otherExpenses.approved + otherExpenses.pending)}</Chip>}
      {currencies.length > 1 && <Chip tone="warning">Mixed currencies ({currencies.join(', ')}) added as they are</Chip>}
    </div>
  )
}

/** Under a container's row: what was paid, then a cost table per PO, then the container's total. Loads when opened. */
export const ContainerCostDetail: React.FC<{ containerId: number }> = ({ containerId }) => {
  const { data, isLoading, isError } = useGetContainerCostDetailQuery(containerId)
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }
  if (isError || !data) return <p className="py-6 text-center text-sm font-medium text-danger-600">Could not load this container&apos;s cost analysis.</p>
  if (data.purchaseOrders.length === 0) return <p className="py-6 text-center text-sm text-text-muted">No packaging list in this container yet, so there is nothing to cost.</p>

  const columns = costColumns(data.expenses)
  return (
    <div className="flex flex-col gap-4">
      <ExpenseChips container={data} />
      {data.purchaseOrders.map((order) => (
        <PoCostTable key={order.id} order={order} columns={columns} />
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary-50 px-4 py-3 text-sm font-semibold text-text-primary">
        <span>
          Container total · {data.totals.cbm.toFixed(2)} CBM · {data.totals.units.toLocaleString('en-CA')} units
        </span>
        <span className="tabular-nums">{formatCurrencyAmount(data.currency, data.totals.total)}</span>
      </div>
    </div>
  )
}
