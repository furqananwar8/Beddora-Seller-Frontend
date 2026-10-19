'use client'

import React from 'react'

import { ProductIdentityCell } from '@/features/profit/dashboard/ProductIdentityCell'
import type { ProductTableColumn } from '@/features/profit/dashboard/SellerboardProductsTable'
import type { BreakEvenItem, BreakEvenStatus } from '@/services/api/breakEven.api'
import { cn } from '@/utils/cn'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'

/**
 * Columns of the Break-even Analysis table (SellerboardProductsTable `columns` mode), one row per SKU: the profit
 * dashboard's product numbers, then the break-even figures. Costs are shown as negative red amounts, as on the
 * dashboard. Every header and cell is centred.
 */

const Cost: React.FC<{ value: number }> = ({ value }) => (
  <span className="text-danger-600">-{formatCurrency(Math.abs(value || 0))}</span>
)

const Signed: React.FC<{ value: number }> = ({ value }) => (
  <span className={cn('font-medium', value >= 0 ? 'text-success-600' : 'text-danger-600')}>{formatCurrency(value || 0)}</span>
)

/** How each status is shown: its badge, and the tint of its whole row (one place, so they never disagree). */
export const STATUS_TONES: Record<BreakEvenStatus, { badge: string; row: string }> = {
  'Above target': {
    badge: 'bg-success-100 text-success-800 border-success-300',
    row: 'bg-success-50 hover:bg-success-100',
  },
  'Meets target': {
    badge: 'bg-warning-100 text-warning-800 border-warning-300',
    row: 'bg-warning-50 hover:bg-warning-100',
  },
  'Below target': {
    badge: 'bg-danger-100 text-danger-800 border-danger-300',
    row: 'bg-danger-50 hover:bg-danger-100',
  },
  'No sales': { badge: 'bg-surface-secondary text-text-muted border-border', row: '' },
}

/** The row tint of a SKU's status. */
export const breakEvenRowClassName = (row: BreakEvenItem) => STATUS_TONES[row.breakEven.status]?.row

const money = (id: string, header: string, value: (row: BreakEvenItem) => number): ProductTableColumn<BreakEvenItem> => ({
  id,
  header,
  sortValue: value,
  render: (row) => formatCurrency(value(row) || 0),
})

const cost = (id: string, header: string, value: (row: BreakEvenItem) => number): ProductTableColumn<BreakEvenItem> => ({
  id,
  header,
  sortValue: (row) => Math.abs(value(row) || 0),
  render: (row) => <Cost value={value(row)} />,
})

const columnsFor = (targetMargin: number): ProductTableColumn<BreakEvenItem>[] => [
  {
    id: 'name',
    header: 'Product',
    minWidth: 300,
    sortValue: (row) => (row.productTitle || row.sku || '').toLowerCase(),
    render: (row) => (
      <div className="flex justify-center">
        <ProductIdentityCell product={row} />
      </div>
    ),
  },
  { id: 'units', header: 'Units sold', sortValue: (row) => row.unitsSold || 0, render: (row) => formatNumber(row.unitsSold || 0, 0) },
  {
    id: 'sales',
    header: 'Sales',
    sortValue: (row) => row.salesRevenue || 0,
    render: (row) => <span className="font-medium">{formatCurrency(row.salesRevenue || 0)}</span>,
  },
  cost('promo', 'Promo', (row) => row.promoRebates),
  cost('ads', 'Ads', (row) => row.advertisingCost),
  cost('amazonFees', 'Amazon fees', (row) => row.totalFees),
  cost('cogs', 'COGS', (row) => row.totalCOGS),
  {
    id: 'netProfit',
    header: 'Net profit',
    sortValue: (row) => row.netProfit || 0,
    render: (row) => <Signed value={row.netProfit} />,
  },
  { id: 'margin', header: 'Margin', sortValue: (row) => row.margin || 0, render: (row) => formatPercentage(row.margin || 0) },
  money('avgPrice', 'Avg selling price', (row) => row.breakEven.avgSellingPrice),
  money('breakevenPrice', 'Break-even price', (row) => row.breakEven.breakevenPrice),
  money('breakevenExclAds', 'Break-even excl. ads', (row) => row.breakEven.breakevenPriceExclAds),
  money('targetPrice', `Price for ${targetMargin}% margin`, (row) => row.breakEven.targetPrice),
  money('targetProfit', `Profit at ${targetMargin}%`, (row) => row.breakEven.targetProfit),
  {
    id: 'targetGap',
    header: 'Gap / (surplus)',
    sortValue: (row) => row.breakEven.targetGap,
    render: (row) => {
      const gap = row.breakEven.targetGap
      return (
        <span className={gap > 0 ? 'text-danger-600' : 'text-success-600'}>
          {gap > 0 ? formatCurrency(gap) : `(${formatCurrency(Math.abs(gap))})`}
        </span>
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    sortValue: (row) => row.breakEven.status,
    render: (row) => (
      <span className={cn('px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded border whitespace-nowrap', STATUS_TONES[row.breakEven.status]?.badge)}>
        {row.breakEven.status}
      </span>
    ),
  },
]

export const buildBreakEvenColumns = (targetMargin: number): ProductTableColumn<BreakEvenItem>[] =>
  columnsFor(targetMargin).map((column) => ({ ...column, align: 'center' }))
