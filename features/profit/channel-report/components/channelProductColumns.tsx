'use client'

import React from 'react'

import type { ProductTableColumn } from '@/features/profit/dashboard/SellerboardProductsTable'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'

import type { ListingBucketId } from '../channelReport.types'
import { amountTone, formatMargin, formatMoney } from '../lib/format'
import type { ProductRow } from '../lib/productRows'
import { ChannelDots, ChannelLabel } from './ChannelBadges'

/**
 * Column config for the Channel Report products table (SellerboardProductsTable `columns` mode).
 * Costs are negative and red; a cost the channel does not report shows italic "n/a".
 */

interface ColumnOptions {
  onLinkProduct: (row: ProductRow) => void
  /** Opens the row's breakdown (same modal as the tiles). */
  onShowDetails: (row: ProductRow) => void
}

const ProductCell: React.FC<{
  row: ProductRow
  isChild: boolean
  isExpanded: boolean
  onToggle: () => void
  onLinkProduct: (row: ProductRow) => void
}> = ({ row, isChild, isExpanded, onToggle, onLinkProduct }) => (
  <div className={cn('flex items-center justify-center gap-2 min-w-[240px] max-w-[320px] mx-auto text-center', isChild && 'pl-8')}>
    {row.kind === 'group' && (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse linked listings' : 'Expand linked listings'}
        className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded border border-border text-text-muted hover:text-text-primary hover:bg-surface-secondary"
      >
        <svg
          className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-90')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    )}

    <div className="min-w-0">
      <div className="text-sm font-medium text-text-primary truncate">{row.title}</div>
      <div className="text-xs text-text-muted truncate">{row.subtitle}</div>
      {row.unlinked && (
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded border border-warning-200 bg-warning-50 text-danger-700">
            Not linked · COGS missing
          </span>
          <button
            type="button"
            onClick={() => onLinkProduct(row)}
            className="text-xs text-primary-600 underline hover:text-primary-700"
          >
            Link to product
          </button>
        </div>
      )}
    </div>
  </div>
)

const Cost: React.FC<{ amount: number | null }> = ({ amount }) => (
  <span className={amount === 0 ? 'text-text-primary' : amountTone(amount)}>{formatMoney(amount)}</span>
)

const costColumn = (
  id: ListingBucketId,
  header: string,
): ProductTableColumn<ProductRow> => ({
  id,
  header,
  align: 'center',
  sortValue: (row) => row.amounts[id] ?? 0,
  render: (row) => <Cost amount={row.amounts[id]} />,
})

export const buildChannelProductColumns = ({
  onLinkProduct,
  onShowDetails,
}: ColumnOptions): ProductTableColumn<ProductRow>[] => [
  {
    id: 'name',
    header: 'Product / channel SKU',
    align: 'center',
    minWidth: 260,
    sortValue: (row) => row.title.toLowerCase(),
    render: (row, ctx) => (
      <ProductCell
        row={row}
        isChild={ctx.isChild}
        isExpanded={ctx.isExpanded}
        onToggle={ctx.toggle}
        onLinkProduct={onLinkProduct}
      />
    ),
  },
  {
    id: 'channel',
    header: 'Channel',
    align: 'center',
    minWidth: 120,
    render: (row) =>
      row.channels.length > 1 ? (
        <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
          <ChannelDots channels={row.channels} />
          {row.channels.length} channels
        </span>
      ) : (
        <ChannelLabel channel={row.channels[0]} className="text-sm whitespace-nowrap" />
      ),
  },
  {
    id: 'units',
    align: 'center',
    header: 'Units',
    sortValue: (row) => row.units,
    render: (row) => formatNumber(row.units, 0),
  },
  {
    id: 'refunds',
    align: 'center',
    header: 'Refunds',
    sortValue: (row) => row.refunds,
    render: (row) => formatNumber(row.refunds, 0),
  },
  {
    id: 'sales',
    align: 'center',
    header: 'Sales',
    sortValue: (row) => row.amounts.sales ?? 0,
    render: (row) => <span className="font-semibold">{formatMoney(row.amounts.sales)}</span>,
  },
  costColumn('promo', 'Promo'),
  costColumn('ads', 'Ads'),
  costColumn('refund', 'Refund cost'),
  costColumn('fees', 'Channel fees'),
  costColumn('fulfillment', 'Fulfillment'),
  costColumn('cogs', 'COGS'),
  {
    id: 'netProfit',
    align: 'center',
    header: 'Net profit',
    sortValue: (row) => row.netProfit,
    render: (row) => (
      <span className={cn('font-semibold', row.netProfit >= 0 ? 'text-success-700' : 'text-danger-700')}>
        {formatMoney(row.netProfit)}
      </span>
    ),
  },
  {
    id: 'margin',
    align: 'center',
    header: 'Margin',
    sortValue: (row) => row.margin ?? 0,
    render: (row) => formatMargin(row.margin),
  },
  {
    id: 'info',
    header: 'Info',
    align: 'center',
    minWidth: 90,
    render: (row) => (
      <button
        type="button"
        onClick={() => onShowDetails(row)}
        className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap"
      >
        More
      </button>
    ),
  },
]
