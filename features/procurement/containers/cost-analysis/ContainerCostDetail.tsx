'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount, formatMoney } from '@/features/finance/shared/format'
import { useGetContainerCostDetailQuery, type ContainerCostItem } from '@/services/api/procurement.api'
import { costColumns } from './costColumns'
import { PoCostTable } from './PoCostTable'

/** A red square on a chip's corner: hovering it (or reading it with a screen reader) gives why the figure needs a look. */
const Alert: React.FC<{ reasons: string[] }> = ({ reasons }) =>
  reasons.length === 0 ? null : (
    <span
      title={reasons.join('\n')}
      aria-label={reasons.join('. ')}
      role="img"
      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 cursor-help items-center justify-center rounded-sm bg-danger-600 text-[10px] font-bold leading-none text-white shadow-sm"
    >
      !
    </span>
  )

const Chip: React.FC<{ reasons?: string[]; children: React.ReactNode }> = ({ reasons = [], children }) => (
  <span className="relative rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary">
    {children}
    <Alert reasons={reasons} />
  </span>
)

/** Why one expense's figure is incomplete: not mapped, awaiting approval, or paid with nothing to split it by. */
function reasonsOf(expense: ContainerCostItem['expenses'][number]): string[] {
  return [
    !expense.mapped && 'Not mapped to an L4 expense yet: use "Map expense columns"',
    expense.pending > 0 && `${formatMoney(expense.pending)} awaiting approval, not in the figures yet`,
    expense.unallocated > 0 && `${formatMoney(expense.unallocated)} not split: no ${expense.basis === 'cbm' ? 'CBM' : 'value'} on the packaging list`,
  ].filter((reason): reason is string => Boolean(reason))
}

/** What was paid per expense; anything not in the figures yet is flagged on the chip it concerns. */
const ExpenseChips: React.FC<{ container: ContainerCostItem }> = ({ container }) => {
  const { expenses, otherExpenses, currencies } = container
  const other = otherExpenses.approved + otherExpenses.pending
  const notes = [
    other > 0 && `${formatMoney(other)} paid against this container is booked to an L4 not mapped to any column`,
    currencies.length > 1 && `Mixed currencies (${currencies.join(', ')}) are added as they are`,
  ].filter((note): note is string => Boolean(note))
  return (
    <div className="flex flex-wrap gap-2.5 pt-1.5">
      {expenses.map((expense) => (
        <Chip key={expense.key} reasons={reasonsOf(expense)}>
          {expense.label} <span className="font-semibold tabular-nums text-text-primary">{formatMoney(expense.paid)}</span>
        </Chip>
      ))}
      {notes.length > 0 && <Chip reasons={notes}>Notes</Chip>}
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
