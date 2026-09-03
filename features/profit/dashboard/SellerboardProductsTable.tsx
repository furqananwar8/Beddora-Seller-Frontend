'use client'

import React, {
  useMemo,
  useState,
  useCallback,
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
import {
  TableSkeleton,
  Spinner,
} from '@/design-system/loaders'
import {
  ProductProfitBreakdown,
} from '@/services/api/profit.api'
import {
  StatModal,
  StatModalData,
} from '@/components/stats/stats.modal'
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '@/utils/format'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'

/* ──────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────── */

export interface SellerboardProductsTableProps {
  products?: ProductProfitBreakdown[]
  isLoading?: boolean
  isFetching?: boolean
  searchTerm?: string
  error?: any
}

type SortColumn =
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
  SortColumn | 'info',
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

const HeaderTooltip: React.FC<{ columnKey: SortColumn | 'info' }> = ({
  columnKey,
}) => {
  const info = COLUMN_TOOLTIPS[columnKey]
  if (!info) return null

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900 text-white text-left text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 font-normal normal-case whitespace-normal">
      <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1 flex items-center gap-1.5">
        <span>{info.title}</span>
      </div>
      <div className="text-gray-300 font-mono text-[11px] bg-gray-800 p-1.5 rounded mb-1.5 border border-gray-700/50 break-words">
        {info.formula}
      </div>
      {info.note && <div className="text-gray-400 text-[10px] leading-tight">{info.note}</div>}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
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

  return {
    title: p.productTitle || p.sku || 'Product',

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
  ({ products, isLoading, isFetching, searchTerm = '', error }) => {
    const [sortColumn, setSortColumn] = useState<SortColumn>('netProfit')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [productStat, setProductStat] = useState<{
      data: StatModalData
      anchorRect: DOMRect
      currency: string
    } | null>(null)

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

    const filteredAndSortedProducts = useMemo(() => {
      if (!products) return []

      let result = [...products] as ProductWithChildren[]

      if (searchTerm) {
        const lower = searchTerm.toLowerCase()
        result = result.filter(
          (product) =>
            product.productTitle?.toLowerCase().includes(lower) ||
            product.sku?.toLowerCase().includes(lower)
        )
      }

      result.sort((a, b) => {
        let aVal: number | string = 0
        let bVal: number | string = 0

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
    }, [products, searchTerm, sortColumn, sortDirection])

    const paginatedProducts = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage
      return filteredAndSortedProducts.slice(
        startIndex,
        startIndex + itemsPerPage
      )
    }, [filteredAndSortedProducts, currentPage])

    const totalPages = Math.ceil(
      filteredAndSortedProducts.length / itemsPerPage
    )

    const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => (
      <span className="ml-1 inline-block text-xs">
        {sortColumn === column ? (
          sortDirection === 'asc' ? '▲' : '▼'
        ) : (
          <span className="text-text-muted">⇅</span>
        )}
      </span>
    )

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
              <div
                className={`
                  flex items-start
                  ${isChild ? 'pl-7' : ''}
                `}
              >
                {!isChild && (
                  <button
                    type="button"
                    onClick={() => toggleRow(product.sku)}
                    className="mt-1 mr-1 w-5 h-5 flex items-center justify-center flex-shrink-0 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
                    aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}

                <div className="flex items-start gap-3 min-w-[280px]">
                  <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.productTitle || product.sku || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-6 h-6 text-text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 max-w-[220px]">
                    <div className="text-xs text-text-muted mb-1 truncate flex items-center gap-1.5">
                      <MarketplaceFlag marketplace={product.marketplace} />
                      <span>{product.sku}</span>
                    </div>

                    <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
                      {product.productTitle || '-'}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <div>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(
                            (product.salesRevenue || 0) /
                              Math.max(product.unitsSold || 1, 1)
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-text-muted">COGS </span>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(product.cogsRate || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-text-primary font-medium">
                          {formatCurrency(
                            Math.abs(product.promoRebates || 0)
                          )}
                        </span>
                        <svg
                          className="w-3 h-3 text-danger-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 01-1-1 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TableCell>

            {/* Units */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatNumber(product.unitsSold || 0, 0)}
            </TableCell>

            {/* Refunds */}
            <TableCell className="text-right whitespace-nowrap px-4 py-3">
              {formatNumber(refundCount, 0)}
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

    if (isLoading) return <TableSkeleton rows={10} columns={15} />

    if (error) {
      return (
        <div className="text-center py-8 text-danger-600">
          Failed to load products. Please try again.
        </div>
      )
    }

    if (!paginatedProducts.length && !isFetching) {
      return (
        <div className="text-center py-8 text-text-muted">
          No products found for this period.
        </div>
      )
    }

    return (
      <div className="space-y-4 relative">
        {isFetching && (
          <div className="absolute inset-0 bg-surface/60 z-20 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <StatModal
          isOpen={!!productStat}
          onClose={() => setProductStat(null)}
          data={productStat?.data || null}
          currency={productStat?.currency || 'CAD'}
          anchorRect={productStat?.anchorRect || null}
        />

        {/* Scroll Container with Bounded Height & Isolated Viewport */}
        <div className="overflow-y-auto overflow-x-auto max-h-[calc(100vh-280px)] border border-border rounded-lg shadow-sm">
          <Table className="min-w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-20 bg-surface shadow-sm">
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
            </TableHeader>

            <TableBody>
              {paginatedProducts.map((product) => renderProductRow(product))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedProducts.length
              )}{' '}
              of {filteredAndSortedProducts.length} products
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