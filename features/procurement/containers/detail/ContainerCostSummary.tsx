'use client'

import React from 'react'
import Link from 'next/link'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetContainerCostDetailQuery, type ContainerCostDetail, type ContainerDetail } from '@/services/api/procurement.api'
import { CostTable } from '../cost-analysis/CostTable'
import { landedCostColumns, landedCostRows } from '../cost-analysis/landedCostColumns'
import { mergeOriginals, OriginalAmount } from '../cost-analysis/OriginalAmount'
import { CONTAINER_ROUTES } from '../routes'

/** What was paid on the container (the invoices' extra charges plus every expense column), for the middle card. */
const expensesOf = (cost: ContainerCostDetail) => cost.totals.additionalExpense + Object.values(cost.totals.costs).reduce((sum, value) => sum + value, 0)

/** The expense names behind the middle card, e.g. "Ocean freight, Trucking, Customs duties". */
const expenseNames = (cost: ContainerCostDetail) => {
  const names = cost.expenses.filter((expense) => expense.paid > 0).map((expense) => expense.label)
  if (cost.totals.additionalExpense > 0) names.unshift('Invoice charges')
  return names.length ? names.join(', ') : 'Freight, trucking, duties'
}

const Card: React.FC<{ title: string; value: string; note: string; original?: React.ReactNode; strong?: boolean }> = ({ title, value, note, original, strong }) => (
  <div className={`min-w-0 flex-1 rounded-lg border px-4 py-3 text-center shadow-sm ${strong ? 'border-primary-300 bg-secondary-50' : 'border-border bg-surface'}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
    <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{value}</p>
    {original}
    <p className="mt-0.5 truncate text-xs text-text-muted" title={note}>
      {note}
    </p>
  </div>
)

const Operator: React.FC<{ children: string }> = ({ children }) => (
  <span aria-hidden className="flex shrink-0 items-center justify-center text-xl font-semibold text-text-muted">
    {children}
  </span>
)

/**
 * The top of a container's details: the money in three cards (goods + expenses = final landed cost) and one row per
 * SKU in it, with the full breakdown on the Cost Analysis screen. Read off the container's cost analysis, so it is
 * only offered to who may open that screen.
 */
export const ContainerCostSummary: React.FC<{ container: Pick<ContainerDetail, 'id'> }> = ({ container }) => {
  const allowed = useAppAbility().can('read', 'containers:cost-analysis')
  const { data, isLoading, isError } = useGetContainerCostDetailQuery(container.id, { skip: !allowed })
  if (!allowed || isError) return null
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  }
  const rows = data ? landedCostRows(data) : []
  if (!data || rows.length === 0) return null

  const money = (value: number) => formatCurrencyAmount(data.currency, value)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Card title="Total FOB value" value={money(data.totals.goods)} original={<OriginalAmount amounts={data.totals.goodsOriginal} />} note="Goods / PO invoices" />
        <Operator>+</Operator>
        <Card
          title="Container expenses"
          value={money(expensesOf(data))}
          original={<OriginalAmount amounts={mergeOriginals(data.totals.additionalOriginal, ...Object.values(data.totals.costsOriginal ?? {}))} />}
          note={expenseNames(data)}
        />
        <Operator>=</Operator>
        <Card title="Final landed cost" value={money(data.totals.total)} note="Capitalized asset" strong />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <p className="text-sm text-text-muted">
            Showing {rows.length} {rows.length === 1 ? 'SKU' : 'SKUs'} in this container
          </p>
          <Link href={CONTAINER_ROUTES.costAnalysis} className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
            Full cost analysis
          </Link>
        </header>
        <CostTable columns={landedCostColumns(data.currency)} rows={rows} rowKey={(row) => `${row.purchaseOrderId}:${row.productId}`} totals={data.totals} />
      </div>
    </section>
  )
}
