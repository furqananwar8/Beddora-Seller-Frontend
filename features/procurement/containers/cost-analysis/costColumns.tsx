import React from 'react'
import { formatCurrencyAmount, formatMoney } from '@/features/finance/shared/format'
import type { ContainerExpense, CostTotals, SkuCostRow } from '@/services/api/procurement.api'
import { OriginalAmount } from './OriginalAmount'

/**
 * The columns of a PO's cost table, in order. Each one says where its value comes from (shown under the header),
 * how to read it off a SKU row, and what its footer adds up; the expense columns are built from the expenses the
 * server reports, so a new expense shows up here without touching this file.
 */
export interface CostColumn<Row = SkuCostRow> {
  key: string
  header: string
  source?: string
  align?: 'left' | 'right' | 'center'
  cell: (row: Row) => React.ReactNode
  footer?: (totals: CostTotals) => React.ReactNode
}

const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => value.toLocaleString('en-CA', { maximumFractionDigits: 1 })
const size = (value: number | null) => (value === null ? '?' : value.toLocaleString('en-CA', { maximumFractionDigits: 1 }))

const PACKING_COLUMNS: CostColumn[] = [
  {
    key: 'sku',
    header: 'SKU',
    align: 'left',
    cell: (row) => (
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold text-text-primary">{row.sku}</p>
        <p className="max-w-[180px] truncate text-[11px] text-text-muted">{row.name}</p>
      </div>
    ),
    footer: () => <span className="font-semibold">PO total</span>,
  },
  { key: 'color', header: 'Color', align: 'left', cell: (row) => row.color ?? '—' },
  { key: 'units', header: 'Units', source: 'PL', cell: (row) => qty(row.units), footer: (totals) => qty(totals.units) },
  { key: 'cartons', header: 'Cartons', source: 'PL', cell: (row) => qty(row.cartons) },
  {
    key: 'carton',
    header: 'Carton L × W × H',
    source: 'PL',
    cell: ({ carton }) => (carton.lengthCm === null && carton.widthCm === null && carton.heightCm === null ? '—' : `${size(carton.lengthCm)} × ${size(carton.widthCm)} × ${size(carton.heightCm)}`),
  },
  { key: 'cbm', header: 'CBM', source: 'PL', cell: (row) => row.cbm.toFixed(2), footer: (totals) => totals.cbm.toFixed(2) },
  { key: 'weight', header: 'Net / gross kg', source: 'PL', cell: (row) => `${kg(row.netWeightKg)} / ${kg(row.grossWeightKg)}` },
  {
    key: 'fob',
    header: 'FOB price',
    source: 'Invoice',
    cell: ({ cost }) => (
      <>
        {formatMoney(cost.fobPrice)}
        {cost.fobOriginal && <span className="block text-[11px] font-normal leading-tight text-text-muted">({formatCurrencyAmount(cost.fobOriginal.currency, cost.fobOriginal.amount)})</span>}
      </>
    ),
  },
  {
    key: 'invoiceAmount',
    header: 'Invoice amount',
    source: 'Units × FOB',
    cell: ({ cost }) => (
      <>
        {formatMoney(cost.goods)}
        <OriginalAmount amounts={cost.goodsOriginal} />
      </>
    ),
    footer: (totals) => (
      <>
        {formatMoney(totals.goods)}
        <OriginalAmount amounts={totals.goodsOriginal} />
      </>
    ),
  },
  {
    key: 'additional',
    header: 'Additional exp',
    source: 'Invoice',
    cell: ({ cost }) => (
      <>
        {formatMoney(cost.additionalExpense)}
        <OriginalAmount amounts={cost.additionalOriginal} />
      </>
    ),
    footer: (totals) => (
      <>
        {formatMoney(totals.additionalExpense)}
        <OriginalAmount amounts={totals.additionalOriginal} />
      </>
    ),
  },
]

const expenseColumn = (expense: ContainerExpense): CostColumn => ({
  key: expense.key,
  header: expense.label,
  cell: ({ cost }) => (
    <>
      {formatMoney(cost.costs[expense.key])}
      <OriginalAmount amounts={cost.costsOriginal?.[expense.key]} />
    </>
  ),
  footer: (totals) => (
    <>
      {formatMoney(totals.costs[expense.key])}
      <OriginalAmount amounts={totals.costsOriginal?.[expense.key]} />
    </>
  ),
})

const TOTAL_COLUMN: CostColumn = {
  key: 'total',
  header: 'Total amount',
  cell: (row) => <span className="font-semibold">{formatMoney(row.cost.total)}</span>,
  footer: (totals) => formatMoney(totals.total),
}

export const costColumns = (expenses: ContainerExpense[]): CostColumn[] => [...PACKING_COLUMNS, ...expenses.map(expenseColumn), TOTAL_COLUMN]
