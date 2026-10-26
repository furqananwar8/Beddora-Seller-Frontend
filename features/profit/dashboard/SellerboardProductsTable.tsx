'use client'

import { useAiContext } from '@/components/ai-assistant'

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { ProductProfitBreakdown } from '@/services/api/profit.api'
import { getFeeTaxRows, sumFeeTaxRows } from '@/utils/feeTax'
import { StatModal, StatModalData } from '@/components/stats/stats.modal'
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '@/utils/format'
import { ProductIdentityCell } from './ProductIdentityCell'
import { RefundReasonsPopover, type RefundReasonsScope } from './components/RefundReasonsPopover'
import { FbaStockPopover } from './components/FbaStockPopover'
import { useGetFbaStockQuery, type FbaStockSummary } from '@/services/api/inventoryPlanner.api'
import { cn } from '@/utils/cn'

/* ──────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────── */

/** State handed to a column's cell renderer. */
export interface ProductTableCellContext {
  isChild: boolean
  isExpanded: boolean
  hasChildren: boolean
  toggle: () => void
}

/**
 * Column definition for the optional `columns` mode. Rows may carry `children` (grouped, expandable rows).
 * Without `columns` the table renders its built-in Amazon columns exactly as before.
 */
export interface ProductTableColumn<Row = any> {
  id: string
  header: React.ReactNode
  align?: 'left' | 'right' | 'center'
  minWidth?: number
  /** Makes the column sortable. Child rows keep their order. */
  sortValue?: (row: Row) => number | string
  render: (row: Row, ctx: ProductTableCellContext) => React.ReactNode
}

export interface SellerboardProductsTableProps {
  products?: ProductProfitBreakdown[]
  isLoading?: boolean
  isFetching?: boolean
  searchTerm?: string
  onSearchChange?: (term: string) => void
  error?: any
  /** Custom columns. Rows are then arbitrary objects (not ProductProfitBreakdown). */
  columns?: ProductTableColumn[]
  /** Unique key of a row. Defaults to `row.sku`. */
  getRowKey?: (row: any) => string
  /** Extra classes for a row in `columns` mode, e.g. a background tint by status. */
  getRowClassName?: (row: any) => string | undefined
  /** Sort column used on first render. Defaults to `netProfit`. */
  defaultSortColumn?: string
  /** Rows per page. Defaults to 20. */
  pageSize?: number
  /** Replaces the "Showing x to y" text and keeps the footer visible with a single page. */
  footerContent?: React.ReactNode | ((range: { from: number; to: number; total: number }) => React.ReactNode)
  /** Message when no rows match. */
  emptyMessage?: string
  /** What the rows cover; when set, a refund count opens that product's refunds by reason. */
  refundReasonsScope?: RefundReasonsScope
  /** When set, each product shows "FBA stock: N" opening its stock details; `marketplace` (CA, US...) narrows it to one marketplace. */
  fbaStockScope?: { marketplace?: string }
  /** The report's currency; the product cell's price and COGS show its symbol (C$...). */
  currency?: string
}

type SortColumn = string

type BuiltInSortColumn =
  | 'name'
  | 'units'
  | 'refunds'
  | 'sales'
  | 'promo'
  | 'ads'
  | 'refundCost'
  | 'amazonFees'
  | 'cogs'
  | 'grossProfit'
  | 'netProfit'
  | 'margin'
  | 'roi'
  | 'bsr'

type SortDirection = 'asc' | 'desc'

type ProductWithChildren = ProductProfitBreakdown & {
  children?: ProductProfitBreakdown[]
  marketplace?: string
}

/* ──────────────────────────────────────────────────────
 * Tooltip Information Map
 * ────────────────────────────────────────────────────── */

const COLUMN_TOOLTIPS: Record<
  BuiltInSortColumn | 'info',
  { title: string; formula: string; note?: string }
> = {
  name: {
    title: 'Product Information',
    formula: 'SKU / ASIN + Product Title',
    note: 'Displays selling price per unit, unit COGS, and unit promotion.',
  },
  units: {
    title: 'Units Sold',
    formula: 'Sum(Quantity Shipped across Shipment Events)',
    note: 'Derived directly from items.contexts[].quantityShipped.',
  },
  refunds: {
    title: 'Refund Units Count',
    formula: 'Sum(Quantity Refunded across Refund Events)',
    note: 'Total units returned or adjusted during the selected period.',
  },
  sales: {
    title: 'Sales Revenue',
    formula: 'Sum(Product Principal Charges for Shipments)',
    note: 'Gross revenue excluding sales tax and promotional discounts.',
  },
  promo: {
    title: 'Promotional Rebates',
    formula: 'Sum(Order Discounts & Promotion Credits)',
    note: 'Discounts given to buyers on sales orders.',
  },
  ads: {
    title: 'Advertising Cost',
    formula: 'SP + SB + SB Video + SD Ad Spend',
    note: 'Matched by SKU or ASIN from Amazon Advertising reports.',
  },
  refundCost: {
    title: 'Net Refund Cost',
    formula: '(Refunded Amount + Tax) + Promo - Refunded Referral Fee + Refund Commission',
    note: 'The total net cash outflow resulting from customer returns.',
  },
  amazonFees: {
    title: 'Amazon Fees',
    formula: 'Referral Fee + FBA Fulfillment + Storage Fees + Refund Commissions + Fee Taxes',
    note: 'Total seller fees deducted by Amazon for services and fulfillment.',
  },
  cogs: {
    title: 'Cost of Goods Sold (COGS)',
    formula: 'Units Sold × Unit COGS Rate',
    note: 'Sourced from your configured product unit cost database.',
  },
  grossProfit: {
    title: 'Gross Profit',
    formula: 'Sales Revenue - Promo - Ads - Amazon Fees - COGS',
    note: 'Profit directly generated from product operations before indirect expenses.',
  },
  netProfit: {
    title: 'Net Profit',
    formula: 'Gross Profit - Indirect Expenses',
    note: 'Final profit remaining after deducting all direct and indirect expenses.',
  },
  margin: {
    title: 'Profit Margin',
    formula: '(Net Profit / Sales Revenue) × 100',
    note: 'Percentage of sales revenue converted into net profit.',
  },
  roi: {
    title: 'Return on Investment (ROI)',
    formula: '(Net Profit / Total COGS) × 100',
    note: 'Efficiency percentage of capital invested in inventory.',
  },
  bsr: {
    title: 'Best Sellers Rank',
    formula: 'Amazon Category Sales Rank',
    note: 'Current or historical rank position in primary category.',
  },
  info: {
    title: 'Detailed Financial Audit',
    formula: 'Full Breakdown Modal',
    note: 'Opens itemized fee, refund, COGS, and sales statement breakdown.',
  },
}

/* ──────────────────────────────────────────────────────
 * Tooltip UI Component
 * ────────────────────────────────────────────────────── */

/** The last columns: their tooltip opens leftwards so it never reaches past the table's right edge. */
const END_ALIGNED_TOOLTIPS = new Set<BuiltInSortColumn | 'info'>(['bsr', 'info'])

/**
 * A column's explanation on header hover. Not rendered (display: none) until then, so a hidden tooltip never widens
 * the table's scroll area and the table fills exactly the width it has.
 */
const HeaderTooltip: React.FC<{ columnKey: BuiltInSortColumn | 'info' }> = ({
  columnKey,
}) => {
  const info = COLUMN_TOOLTIPS[columnKey]
  if (!info) return null
  const atEnd = END_ALIGNED_TOOLTIPS.has(columnKey)

  return (
    <div className={cn('absolute top-full mt-2 hidden w-64 p-3 bg-gray-900 text-white text-left text-xs rounded-md shadow-xl group-hover:block pointer-events-none z-50 font-normal normal-case whitespace-normal', atEnd ? 'right-0' : 'left-1/2 -translate-x-1/2')}>
      <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1 flex items-center gap-1.5">
        <span>{info.title}</span>
      </div>
      <div className="text-gray-300 font-mono text-[11px] bg-gray-800 p-1.5 rounded mb-1.5 border border-gray-700/50 break-words">
        {info.formula}
      </div>
      {info.note && <div className="text-gray-400 text-[10px] leading-tight">{info.note}</div>}
      <div className={cn('absolute bottom-full border-4 border-transparent border-b-gray-900', atEnd ? 'right-4' : 'left-1/2 -translate-x-1/2')} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────
 * Build StatModal Data
 * ────────────────────────────────────────────────────── */

const buildProductStatData = (
  p: ProductProfitBreakdown
): StatModalData => {
  const refundCount = p.totalRefunds || 0
  const refundCost = Math.abs(p.refundCost || 0)
  const totalFees = Math.abs(p.totalFees || 0)
  const advertisingCost = Math.abs(p.advertisingCost || 0)
  const totalCOGS = Math.abs(p.totalCOGS || 0)
  const promoRebates = Math.abs(p.promoRebates || 0)

  const refundDetails = (p as any).refundDetails || {}
  const feeDetails = (p as any).amazonFeeDetails || {}

  const refundTax = Number(refundDetails.refundTax ?? (p as any).refundTax ?? 0)
  const feeTaxRows = getFeeTaxRows(feeDetails.feeTax)

  return {
    title: p.productTitle || p.sku || 'Product',
    unitCount: p.unitsSold,

    sections: [
      {
        title: 'Sales',
        value: p.salesRevenue,
        currency: true,
        defaultOpen: true,
      },
      {
        title: 'Units',
        value: p.unitsSold,
        defaultOpen: true,
      },
      {
        title: 'Advertising cost',
        value: advertisingCost,
        currency: true,
        children: [
          {
            label: 'Advertising cost',
            value: advertisingCost,
            currency: true,
          },
        ].filter((item) => Math.abs(Number(item.value || 0)) > 0),
      },
      {
        title: 'Refund cost',
        value: refundCost,
        currency: true,
        defaultOpen: true,
        children: [
          {
            label: 'Refunded amount',
            value: -(refundDetails.refundedAmount || 0),
            currency: true,
          },
          {
            label: 'Value of returned items',
            value: refundDetails.valueOfReturnedItems || 0,
            currency: true,
          },
          {
            label: 'Sales tax refunded',
            value: refundTax,
            currency: true,
            tooltipKey: 'Sales tax refunded',
          },
          {
            label: 'Promotion adjustment',
            value: refundDetails.promotion || 0,
            currency: true,
          },
          {
            label: 'Refund commission',
            value: -(refundDetails.refundCommission || 0),
            currency: true,
          },
          {
            label: 'Refunded referral fee',
            value: refundDetails.refundedReferralFee || 0,
            currency: true,
          },
          {
            label: 'Refund count',
            value: refundCount,
            integer: true,
          },
        ].filter(
          (item) => item.integer || Math.abs(Number(item.value || 0)) > 0
        ),
      },
      {
        title: 'Amazon fees',
        value: totalFees,
        currency: true,
        defaultOpen: true,
        children: [
          {
            label: 'FBA per unit fulfillment fee',
            value: feeDetails.fbaPerUnitFulfillmentFee ?? p.fbaFees,
            currency: true,
          },
          {
            label: 'Selling fees / Referral fee',
            value: feeDetails.referralFee ?? p.sellingFees,
            currency: true,
          },
          {
            label: 'FBA storage fee',
            value: feeDetails.fbaStorageFee,
            currency: true,
          },
          {
            label: 'Sales tax collection fee',
            value: feeDetails.salesTaxCollectionFee,
            currency: true,
          },
          {
            label: 'Reversal reimbursement',
            value: feeDetails.reversalReimbursement,
            currency: true,
          },
          {
            label: 'Other Amazon adjustments',
            value: feeDetails.other,
            currency: true,
          },
        ].filter((item) => Math.abs(Number(item.value || 0)) > 0),
      },
      ...(feeTaxRows.length > 0
        ? [
            {
              title: 'Tax',
              value: sumFeeTaxRows(feeTaxRows),
              currency: true,
              defaultOpen: true,
              children: feeTaxRows.map((row) => ({
                label: row.label,
                value: row.value,
                currency: true,
              })),
            },
          ]
        : []),
      {
        title: 'Cost of goods',
        value: totalCOGS,
        currency: true,
        defaultOpen: true,
        children: [
          {
            label: 'Cost of goods sold',
            value: totalCOGS,
            currency: true,
          },
        ].filter((item) => Math.abs(Number(item.value || 0)) > 0),
      },
    ],

    summaryRows: [
      {
        label: 'Promo',
        value: promoRebates,
        currency: true,
      },
      {
        label: 'Gross profit',
        value: p.grossProfit,
        currency: true,
      },
      {
        label: 'Indirect expenses',
        value: p.totalExpenses,
        currency: true,
      },
      {
        label: 'Net profit',
        value: p.netProfit,
        currency: true,
      },
      // Shown for awareness, not deducted from Net profit
      ...[
        { label: 'Est. storage cost', value: Number(p.estimatedStorageFee || 0), currency: true },
        { label: 'Long-term storage', value: Number(p.longTermStorageFee || 0), currency: true },
      ].filter((item) => item.value > 0),
      {
        label: 'Real ACOS',
        value: p.realACOS,
        percentage: true,
      },
      {
        label: '% Refunds',
        value:
          p.salesRevenue > 0
            ? ((refundDetails.refundedAmount || 0) / p.salesRevenue) * 100
            : 0,
        percentage: true,
      },
      {
        label: 'Margin',
        value: p.margin,
        percentage: true,
      },
      {
        label: 'ROI',
        value: p.roi,
        percentage: true,
      },
    ],
  }
}

/* ──────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────── */

export const SellerboardProductsTable: React.FC<
  SellerboardProductsTableProps
> = React.memo(
  ({
    products,
    isLoading,
    isFetching,
    searchTerm = '',
    error,
    columns,
    getRowKey,
    getRowClassName,
    defaultSortColumn = 'netProfit',
    pageSize = 20,
    footerContent,
    emptyMessage = 'No products found matching your search criteria.',
    refundReasonsScope,
    fbaStockScope,
    currency,
  }) => {
    const [sortColumn, setSortColumn] = useState<SortColumn>(defaultSortColumn)
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const itemsPerPage = pageSize
    const rowKeyOf = (row: any): string => (getRowKey ? getRowKey(row) : row.sku)

    // Preserve previous products so search refetches don't drop data to undefined
    const previousProductsRef = useRef<ProductProfitBreakdown[] | undefined>(products)
    if (products !== undefined) {
      previousProductsRef.current = products
    }
    const activeProducts = products ?? previousProductsRef.current

    // Let the Ask AI assistant see this table's real numbers (top sellers first)
    useAiContext({
      pageName: columns
        ? 'Profit by product and channel listing'
        : 'Profit by product (sales, ads, fees, COGS, profit)',
      data: columns
        ? []
        : (activeProducts ?? [])
        .slice()
        .sort((x, y) => (y.salesRevenue || 0) - (x.salesRevenue || 0))
        .slice(0, 30)
        .map((x) => ({
          sku: x.sku,
          title: x.productTitle,
          units: x.unitsSold,
          sales: x.salesRevenue,
          ads: x.advertisingCost,
          refunds: x.totalRefunds,
          fees: x.totalFees,
          cogs: x.totalCOGS,
          netProfit: x.netProfit,
          margin: x.margin,
          roi: x.roi,
          realACOS: x.realACOS,
        })),
    })

    // Auto-expand parent rows when search is active
    useEffect(() => {
      if (searchTerm.trim() && activeProducts && activeProducts.length > 0) {
        const parentSkusToExpand = new Set<string>()

        activeProducts.forEach((product) => {
          const p = product as ProductWithChildren
          if (p.children && p.children.length > 0) {
            parentSkusToExpand.add(rowKeyOf(p))
          }
        })

        setExpandedRows(parentSkusToExpand)
      }
    }, [activeProducts, searchTerm])

    const [productStat, setProductStat] = useState<{
      data: StatModalData
      anchorRect: DOMRect
      currency: string
    } | null>(null)

    const [refundTarget, setRefundTarget] = useState<{ product: ProductProfitBreakdown; anchorRect: DOMRect } | null>(null)
    const closeRefunds = useCallback(() => setRefundTarget(null), [])

    const toggleRow = useCallback((sku: string) => {
      setExpandedRows((previous) => {
        const next = new Set(previous)
        if (next.has(sku)) {
          next.delete(sku)
        } else {
          next.add(sku)
        }
        return next
      })
    }, [])

    const handleSort = useCallback(
      (column: SortColumn) => {
        if (sortColumn === column) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
          setSortColumn(column)
          setSortDirection('desc')
        }
      },
      [sortColumn, sortDirection]
    )

    const sortedProducts = useMemo(() => {
      if (!activeProducts) return []

      const result = [...activeProducts] as ProductWithChildren[]
      const customSortValue = columns?.find((column) => column.id === sortColumn)?.sortValue

      result.sort((a, b) => {
        let aVal: number | string = 0
        let bVal: number | string = 0

        if (columns) {
          if (!customSortValue) return 0
          aVal = customSortValue(a)
          bVal = customSortValue(b)
          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
          return 0
        }

        switch (sortColumn) {
          case 'name':
            aVal = a.productTitle || ''
            bVal = b.productTitle || ''
            break
          case 'units':
            aVal = a.unitsSold || 0
            bVal = b.unitsSold || 0
            break
          case 'refunds':
            aVal = a.totalRefunds || 0
            bVal = b.totalRefunds || 0
            break
          case 'sales':
            aVal = a.salesRevenue || 0
            bVal = b.salesRevenue || 0
            break
          case 'promo':
            aVal = a.promoRebates || 0
            bVal = b.promoRebates || 0
            break
          case 'ads':
            aVal = a.advertisingCost || 0
            bVal = b.advertisingCost || 0
            break
          case 'refundCost':
            aVal = a.refundCost || 0
            bVal = b.refundCost || 0
            break
          case 'amazonFees':
            aVal = a.totalFees || 0
            bVal = b.totalFees || 0
            break
          case 'cogs':
            aVal = a.totalCOGS || 0
            bVal = b.totalCOGS || 0
            break
          case 'grossProfit':
            aVal = a.grossProfit || 0
            bVal = b.grossProfit || 0
            break
          case 'netProfit':
            aVal = a.netProfit || 0
            bVal = b.netProfit || 0
            break
          case 'margin':
            aVal = a.margin || 0
            bVal = b.margin || 0
            break
          case 'roi':
            aVal = a.roi || 0
            bVal = b.roi || 0
            break
          case 'bsr':
            aVal = 0
            bVal = 0
            break
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })

      return result
    }, [activeProducts, sortColumn, sortDirection, columns])

    const paginatedProducts = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage
      return sortedProducts.slice(
        startIndex,
        startIndex + itemsPerPage
      )
    }, [sortedProducts, currentPage])

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)

    // One stock lookup for every product on the page, children included (they show when expanded)
    const pageSkus = useMemo(
      () => (fbaStockScope ? [...new Set(paginatedProducts.flatMap((product) => [product.sku, ...(product.children ?? []).map((child) => child.sku)]))] : []),
      [fbaStockScope, paginatedProducts]
    )
    const { data: fbaStock } = useGetFbaStockQuery({ skus: pageSkus, marketplace: fbaStockScope?.marketplace }, { skip: pageSkus.length === 0 })
    const fbaStockBySku = useMemo(() => new Map((fbaStock ?? []).map((row) => [row.sku, row])), [fbaStock])
    const [fbaTarget, setFbaTarget] = useState<{ stock: FbaStockSummary; cogsRate: number | null; anchorRect: DOMRect } | null>(null)
    const closeFbaStock = useCallback(() => setFbaTarget(null), [])

    const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => (
      <span className="ml-1 inline-block text-xs">
        {sortColumn === column ? (
          sortDirection === 'asc' ? '▲' : '▼'
        ) : (
          <span className="text-text-muted">⇅</span>
        )}
      </span>
    )

    const renderColumnsRow = (row: any, isChild = false): React.ReactNode => {
      const key = rowKeyOf(row)
      const isExpanded = expandedRows.has(key)
      const hasChildren = !!row.children?.length

      return (
        <React.Fragment key={key}>
          <TableRow
            className={cn(
              'hover:bg-surface-secondary transition-colors',
              isChild && 'bg-surface-secondary/30',
              getRowClassName?.(row)
            )}
          >
            {columns!.map((column) => (
              <TableCell
                key={column.id}
                className={cn(
                  'px-4 py-3 align-middle',
                  column.align === 'left' && 'text-left',
                  column.align === 'center' && 'text-center',
                  (!column.align || column.align === 'right') && 'text-right whitespace-nowrap'
                )}
              >
                {column.render(row, {
                  isChild,
                  isExpanded,
                  hasChildren,
                  toggle: () => toggleRow(key),
                })}
              </TableCell>
            ))}
          </TableRow>

          {isExpanded && row.children?.map((child: any) => renderColumnsRow(child, true))}
        </React.Fragment>
      )
    }

    const renderProductRow = (
      product: ProductWithChildren,
      isChild = false
    ) => {
      const isExpanded = expandedRows.has(product.sku)
      const refundCount = product.totalRefunds || 0

      return (
        <React.Fragment key={product.sku}>
          <TableRow
            className={`
              hover:bg-surface-secondary
              transition-colors
              ${isChild ? 'bg-surface-secondary/30' : ''}
            `}
          >
            {/* Product Column */}
            <TableCell className="text-left px-4 py-3">
              <ProductIdentityCell
                product={product}
                isChild={isChild}
                isExpanded={isExpanded}
                onToggle={() => toggleRow(product.sku)}
                titleInTooltip
                currency={currency}
                fbaStock={(product.children?.length ?? 0) === 0 ? fbaStockBySku.get(product.sku)?.regions ? fbaStockBySku.get(product.sku) : null : null}
                onFbaStockClick={
                  fbaStockScope
                    ? (anchorRect) => {
                        const stock = fbaStockBySku.get(product.sku)
                        if (stock) setFbaTarget({ stock, cogsRate: product.cogsRate ?? null, anchorRect })
                      }
                    : undefined
                }
              />
            </TableCell>

            {/* Units */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatNumber(product.unitsSold || 0, 0)}
            </TableCell>

            {/* Refunds */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {refundCount > 0 && refundReasonsScope ? (
                <button
                  type="button"
                  onClick={(e) => setRefundTarget({ product, anchorRect: e.currentTarget.getBoundingClientRect() })}
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                  aria-label={`Refunds by reason for ${product.sku}`}
                >
                  {formatNumber(refundCount, 0)}
                </button>
              ) : (
                formatNumber(refundCount, 0)
              )}
            </TableCell>

            {/* Sales */}
            <TableCell className="text-right font-medium whitespace-nowrap px-4 py-3">
              {formatCurrency(product.salesRevenue || 0)}
            </TableCell>

            {/* Promo */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatCurrency(Math.abs(product.promoRebates || 0))}
            </TableCell>

            {/* Ads */}
            <TableCell className="text-right text-danger-600 whitespace-nowrap px-4 py-3">
              -{formatCurrency(Math.abs(product.advertisingCost || 0))}
            </TableCell>

            {/* Refund Cost */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatCurrency(Math.abs(product.refundCost || 0))}
            </TableCell>

            {/* Amazon Fees */}
            <TableCell className="text-right text-danger-600 whitespace-nowrap px-4 py-3">
              -{formatCurrency(Math.abs(product.totalFees || 0))}
            </TableCell>

            {/* COGS */}
            <TableCell className="text-right text-danger-600 whitespace-nowrap px-4 py-3">
              -{formatCurrency(Math.abs(product.totalCOGS || 0))}
            </TableCell>

            {/* Gross Profit */}
            <TableCell className="text-right font-medium text-success-600 whitespace-nowrap px-4 py-3">
              {formatCurrency(product.grossProfit || 0)}
            </TableCell>

            {/* Net Profit */}
            <TableCell className="text-right font-semibold text-success-600 whitespace-nowrap px-4 py-3">
              {formatCurrency(product.netProfit || 0)}
            </TableCell>

            {/* Margin */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatPercentage(product.margin || 0)}
            </TableCell>

            {/* ROI */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatPercentage(product.roi || 0)}
            </TableCell>

            {/* BSR */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              <span className="text-text-muted">—</span>
            </TableCell>

            {/* Info */}
            <TableCell className="text-center whitespace-nowrap px-4 py-3">
              <button
                onClick={(e) => {
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect()
                  const marketCurrency =
                    product.marketplace?.toUpperCase() === 'US' ||
                    product.marketplace?.toUpperCase() === 'USA'
                      ? 'USD'
                      : 'CAD'

                  setProductStat({
                    data: buildProductStatData(product),
                    anchorRect: rect,
                    currency: marketCurrency,
                  })
                }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                More
              </button>
            </TableCell>
          </TableRow>

          {/* Children */}
          {isExpanded &&
            product.children?.map((child) => renderProductRow(child, true))}
        </React.Fragment>
      )
    }

    const showInitialLoading = isLoading || (isFetching && (!activeProducts || activeProducts.length === 0))
    const isTableEmpty = showInitialLoading || error || !paginatedProducts.length

    // Loading / error / no rows: shown over the visible part of the table (below the header), never as a cell as wide
    // as every column, so it stays centred in view however far the table scrolls
    const stateMessage = showInitialLoading ? (
      <div className="flex flex-col items-center gap-2">
        <Spinner />
        <span className="text-xs font-medium text-text-muted">Loading products...</span>
      </div>
    ) : error ? (
      <span className="text-danger-600 font-medium">Failed to load products. Please try again.</span>
    ) : !paginatedProducts.length ? (
      <span className="text-text-muted">{emptyMessage}</span>
    ) : null

    return (
      // data-ai-registered: the AI already gets this table via useAiContext, skip the DOM copy
      <div className="w-full space-y-4 relative min-h-[400px]" data-ai-registered>
        {/* Single Refetch Backdrop Overlay */}
        {isFetching && !showInitialLoading && activeProducts && activeProducts.length > 0 && (
          <div className="absolute inset-0 bg-surface/65 backdrop-blur-[1px] z-30 flex items-center justify-center rounded-lg transition-opacity duration-200">
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span className="text-xs font-medium text-text-muted">
                Updating products...
              </span>
            </div>
          </div>
        )}

        {fbaTarget && <FbaStockPopover stock={fbaTarget.stock} cogsRate={fbaTarget.cogsRate} anchorRect={fbaTarget.anchorRect} onClose={closeFbaStock} />}

        {refundTarget && refundReasonsScope && (
          <RefundReasonsPopover
            product={refundTarget.product}
            scope={refundReasonsScope}
            anchorRect={refundTarget.anchorRect}
            onClose={closeRefunds}
          />
        )}

        <StatModal
          isOpen={!!productStat}
          onClose={() => setProductStat(null)}
          data={productStat?.data || null}
          currency={productStat?.currency || 'CAD'}
          anchorRect={productStat?.anchorRect || null}
        />

        {/* Scroll Container: the only scroller (the table's own wrapper does not scroll), so its scrollbars sit on its edges.
            The vertical track starts under the sticky header row (h-12), so the bar never runs beside the header. */}
        <div className="relative">
        <div className="w-full h-[500px] max-h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto overflow-x-auto border border-border rounded-lg shadow-sm flex flex-col [&::-webkit-scrollbar-track:vertical]:mt-12">
          <Table wrapperClassName="overflow-visible" className="min-w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-20 bg-surface shadow-sm">
              {columns ? (
                <TableRow className="bg-surface h-12">
                  {columns.map((column) => (
                    <TableHead
                      key={column.id}
                      style={{ minWidth: column.minWidth }}
                      className={cn(
                        'sticky top-0 z-20 bg-surface py-3 px-4 border-b border-border align-middle',
                        column.sortValue && 'cursor-pointer hover:bg-surface-secondary',
                        column.align === 'left' && 'text-left',
                        column.align === 'center' && 'text-center',
                        (!column.align || column.align === 'right') && 'text-right'
                      )}
                      onClick={column.sortValue ? () => handleSort(column.id) : undefined}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap',
                          column.align === 'left' && 'justify-start',
                          column.align === 'center' && 'justify-center',
                          (!column.align || column.align === 'right') && 'justify-end'
                        )}
                      >
                        <span>{column.header}</span>
                        {column.sortValue && <SortIcon column={column.id} />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ) : (
              <TableRow className="bg-surface h-12">
                {/* Product Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-left min-w-[320px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-start gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Product</span>
                    <SortIcon column="name" />
                  </div>
                  <HeaderTooltip columnKey="name" />
                </TableHead>

                {/* Units Sold Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[120px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('units')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Units Sold</span>
                    <SortIcon column="units" />
                  </div>
                  <HeaderTooltip columnKey="units" />
                </TableHead>

                {/* Refunds Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[110px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('refunds')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Refunds</span>
                    <SortIcon column="refunds" />
                  </div>
                  <HeaderTooltip columnKey="refunds" />
                </TableHead>

                {/* Sales Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[130px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('sales')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Sales</span>
                    <SortIcon column="sales" />
                  </div>
                  <HeaderTooltip columnKey="sales" />
                </TableHead>

                {/* Promo Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[120px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('promo')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Promo</span>
                    <SortIcon column="promo" />
                  </div>
                  <HeaderTooltip columnKey="promo" />
                </TableHead>

                {/* Ads Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[130px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('ads')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Ads</span>
                    <SortIcon column="ads" />
                  </div>
                  <HeaderTooltip columnKey="ads" />
                </TableHead>

                {/* Refund Cost Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[140px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('refundCost')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Refund Cost</span>
                    <SortIcon column="refundCost" />
                  </div>
                  <HeaderTooltip columnKey="refundCost" />
                </TableHead>

                {/* Amazon Fees Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[140px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('amazonFees')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Amazon Fees</span>
                    <SortIcon column="amazonFees" />
                  </div>
                  <HeaderTooltip columnKey="amazonFees" />
                </TableHead>

                {/* COGS Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[140px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('cogs')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Cost of Goods</span>
                    <SortIcon column="cogs" />
                  </div>
                  <HeaderTooltip columnKey="cogs" />
                </TableHead>

                {/* Gross Profit Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[130px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('grossProfit')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Gross Profit</span>
                    <SortIcon column="grossProfit" />
                  </div>
                  <HeaderTooltip columnKey="grossProfit" />
                </TableHead>

                {/* Net Profit Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[130px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('netProfit')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Net Profit</span>
                    <SortIcon column="netProfit" />
                  </div>
                  <HeaderTooltip columnKey="netProfit" />
                </TableHead>

                {/* Margin Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[110px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Margin</span>
                    <SortIcon column="margin" />
                  </div>
                  <HeaderTooltip columnKey="margin" />
                </TableHead>

                {/* ROI Column */}
                <TableHead
                  className="sticky top-0 z-20 bg-surface group relative cursor-pointer hover:bg-surface-secondary text-right min-w-[110px] py-3 px-4 border-b border-border align-middle"
                  onClick={() => handleSort('roi')}
                >
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>ROI</span>
                    <SortIcon column="roi" />
                  </div>
                  <HeaderTooltip columnKey="roi" />
                </TableHead>

                {/* BSR Column */}
                <TableHead className="sticky top-0 z-20 bg-surface group relative text-right min-w-[90px] py-3 px-4 border-b border-border align-middle">
                  <div className="flex items-center justify-end gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>BSR</span>
                  </div>
                  <HeaderTooltip columnKey="bsr" />
                </TableHead>

                {/* Info Column */}
                <TableHead className="sticky top-0 z-20 bg-surface group relative text-center min-w-[90px] py-3 px-4 border-b border-border align-middle">
                  <div className="flex items-center justify-center gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                    <span>Info</span>
                  </div>
                  <HeaderTooltip columnKey="info" />
                </TableHead>
              </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {!isTableEmpty &&
                paginatedProducts.map((product) =>
                  columns ? renderColumnsRow(product) : renderProductRow(product)
                )}
            </TableBody>
          </Table>
        </div>
          {stateMessage && (
            <div className="absolute inset-x-0 top-12 bottom-0 flex items-center justify-center pointer-events-none text-center px-6">
              {stateMessage}
            </div>
          )}
        </div>

        {(totalPages > 1 || footerContent) && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              {typeof footerContent === 'function'
                ? footerContent({
                    from: sortedProducts.length ? (currentPage - 1) * itemsPerPage + 1 : 0,
                    to: Math.min(currentPage * itemsPerPage, sortedProducts.length),
                    total: sortedProducts.length,
                  })
                : footerContent ?? (
                <>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(
                    currentPage * itemsPerPage,
                    sortedProducts.length
                  )}{' '}
                  of {sortedProducts.length} products
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }
)