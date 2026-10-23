import React from 'react'
import { formatMoney } from '@/features/finance/shared/format'
import type { ContainerExpense, CostTotals, SkuCostRow } from '@/services/api/procurement.api'

/**
 * The columns of a PO's cost table, in order. Each one says where its value comes from (shown under the header),
 * how to read it off a SKU row, and what its footer adds up; the expense columns are built from the expenses the
 * server reports, so a new expense shows up here without touching this file.
 */
export interface CostColumn {
  key: string
  header: string
  source?: string
  align?: 'left' | 'right'
  cell: (row: SkuCostRow) => React.ReactNode
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
  { key: 'fob', header: 'FOB price', source: 'Invoice', cell: (row) => formatMoney(row.cost.fobPrice) },
  { key: 'additional', header: 'Additional exp', source: 'Invoice', cell: (row) => formatMoney(row.cost.additionalExpense), footer: (totals) => formatMoney(totals.additionalExpense) },
]

const BASIS_SOURCE: Record<ContainerExpense['basis'], string> = { cbm: 'By CBM', value: 'By value' }

const expenseColumn = (expense: ContainerExpense): CostColumn => ({
  key: expense.key,
  header: expense.label,
  source: BASIS_SOURCE[expense.basis],
  cell: (row) => formatMoney(row.cost.costs[expense.key]),
  footer: (totals) => formatMoney(totals.costs[expense.key]),
})

const TOTAL_COLUMN: CostColumn = {
  key: 'total',
  header: 'Total amount',
  cell: (row) => <span className="font-semibold">{formatMoney(row.cost.total)}</span>,
  footer: (totals) => formatMoney(totals.total),
}

export const costColumns = (expenses: ContainerExpense[]): CostColumn[] => [...PACKING_COLUMNS, ...expenses.map(expenseColumn), TOTAL_COLUMN]
