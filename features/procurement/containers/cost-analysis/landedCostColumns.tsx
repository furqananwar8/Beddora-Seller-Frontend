import React from 'react'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { ContainerCostDetail, CostTotals, SkuCostRow } from '@/services/api/procurement.api'
import type { CostColumn } from './costColumns'

/** A SKU of the container with the supplier of the PO it came on. */
export interface LandedCostRow extends SkuCostRow {
  supplier: string
}

/** Everything on top of the goods: the invoice's additional expense plus each container expense split onto it. */
const allocated = (cost: Pick<CostTotals, 'goods' | 'total'>) => cost.total - cost.goods
const qty = (value: number) => value.toLocaleString('en-CA')

/** Every SKU across the container's POs, each tagged with its PO's supplier. */
export const landedCostRows = (detail: ContainerCostDetail): LandedCostRow[] =>
  detail.purchaseOrders.flatMap((order) => order.skus.map((sku) => ({ ...sku, supplier: order.supplier?.name ?? 'Unknown supplier' })))

/** The landed cost per SKU, in the container's currency: FOB amount, allocated expenses and what it comes to. */
export const landedCostColumns = (currency: string): CostColumn<LandedCostRow>[] => {
  const money = (value: number) => formatCurrencyAmount(currency, value)
  return [
    { key: 'sku', header: 'SKU code', align: 'left', cell: (row) => <span className="font-mono font-semibold text-text-primary">{row.sku}</span>, footer: () => 'Total' },
    { key: 'supplier', header: 'Supplier', align: 'left', cell: (row) => row.supplier },
    { key: 'units', header: 'Units', cell: (row) => qty(row.units), footer: (totals) => qty(totals.units) },
    { key: 'cbm', header: 'Total CBM', cell: (row) => row.cbm.toFixed(2), footer: (totals) => totals.cbm.toFixed(2) },
    { key: 'fob', header: 'FOB amount', cell: (row) => money(row.cost.goods), footer: (totals) => money(totals.goods) },
    { key: 'allocated', header: 'Allocated exp', cell: (row) => money(allocated(row.cost)), footer: (totals) => money(allocated(totals)) },
    { key: 'landed', header: 'Final landed amount', cell: (row) => <span className="font-semibold">{money(row.cost.total)}</span>, footer: (totals) => money(totals.total) },
  ]
}
