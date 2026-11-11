import React from 'react'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { toProperName } from '@/utils/format'
import type { ContainerCostDetail, CostTotals, SkuCostRow } from '@/services/api/procurement.api'
import type { CostColumn } from './costColumns'
import { mergeOriginals, OriginalAmount } from './OriginalAmount'

/** A SKU of the container with the supplier of the PO it came on. */
export interface LandedCostRow extends SkuCostRow {
  supplier: string
}

/** Everything on top of the goods: the invoice's additional expense plus each container expense split onto it. */
const allocated = (cost: Pick<CostTotals, 'goods' | 'total'>) => cost.total - cost.goods
/** What the allocated expenses were before conversion: the invoice's additional expense and every expense column. */
const allocatedOriginal = (cost: Pick<CostTotals, 'additionalOriginal' | 'costsOriginal'>) => mergeOriginals(cost.additionalOriginal, ...Object.values(cost.costsOriginal ?? {}))
const qty = (value: number) => value.toLocaleString('en-CA')

/** Every SKU across the container's POs, each tagged with its PO's supplier. */
export const landedCostRows = (detail: ContainerCostDetail): LandedCostRow[] =>
  detail.purchaseOrders.flatMap((order) => order.skus.map((sku) => ({ ...sku, supplier: order.supplier ? toProperName(order.supplier.name) : 'Unknown supplier' })))

/** The landed cost per SKU, in the container's currency: FOB amount, allocated expenses and what it comes to. Every column is centred. */
export const landedCostColumns = (currency: string): CostColumn<LandedCostRow>[] => {
  const money = (value: number) => formatCurrencyAmount(currency, value)
  return [
    { key: 'sku', header: 'SKU code', align: 'center', cell: (row) => <span className="font-mono font-semibold text-text-primary">{row.sku}</span>, footer: () => 'Total' },
    { key: 'supplier', header: 'Supplier', align: 'center', wrap: true, cell: (row) => row.supplier },
    { key: 'units', header: 'Units', align: 'center', cell: (row) => qty(row.units), footer: (totals) => qty(totals.units) },
    { key: 'cbm', header: 'Total CBM', align: 'center', cell: (row) => row.cbm.toFixed(2), footer: (totals) => totals.cbm.toFixed(2) },
    {
      key: 'fob',
      header: 'FOB amount',
      align: 'center',
      cell: (row) => (
        <>
          {money(row.cost.goods)}
          <OriginalAmount amounts={row.cost.goodsOriginal} />
        </>
      ),
      footer: (totals) => (
        <>
          {money(totals.goods)}
          <OriginalAmount amounts={totals.goodsOriginal} />
        </>
      ),
    },
    {
      key: 'allocated',
      header: 'Allocated exp',
      align: 'center',
      cell: (row) => (
        <>
          {money(allocated(row.cost))}
          <OriginalAmount amounts={allocatedOriginal(row.cost)} />
        </>
      ),
      footer: (totals) => (
        <>
          {money(allocated(totals))}
          <OriginalAmount amounts={allocatedOriginal(totals)} />
        </>
      ),
    },
    { key: 'landed', header: 'Final landed amount', align: 'center', cell: (row) => <span className="font-semibold">{money(row.cost.total)}</span>, footer: (totals) => money(totals.total) },
  ]
}
