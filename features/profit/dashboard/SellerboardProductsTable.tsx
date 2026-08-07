"use client"

import React, { useMemo, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { TableSkeleton, Spinner } from '@/design-system/loaders'
import { ProductProfitBreakdown } from '@/services/api/profit.api'
import { StatModal, StatModalData } from '@/components/stats/stats.modal'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { cn } from '@/utils/cn'

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
  | 'amazonFees'
  | 'cogs'
  | 'grossProfit'
  | 'netProfit'
  | 'margin'
  | 'roi'
  | 'bsr'
type SortDirection = 'asc' | 'desc'

/* ── Build StatModal data from product ─────────────────── */

const buildProductStatData = (p: ProductProfitBreakdown): StatModalData => {
  const roi = p.totalCOGS > 0 ? (p.netProfit / p.totalCOGS) * 100 : 0

  return {
    title: p.productTitle || p.sku || 'Product',
    sections: [
      {
        title: 'Sales',
        value: p.salesRevenue,
        currency: true,
        defaultOpen: true,
        children: [
          { label: 'Organic', value: 0, currency: true },
          { label: 'Sponsored Products (same day)', value: 0, currency: true },
          { label: 'Sponsored Display (same day)', value: 0, currency: true },
          { label: 'Direct sales', value: 0, currency: true },
          { label: 'Subscription sales (est.)', value: 0, currency: true },
        ],
      },
      {
        title: 'Units',
        value: p.unitsSold,
        defaultOpen: true,
        children: [
          { label: 'Organic', value: 0, integer: true },
          { label: 'Sponsored Products (same day)', value: 0, integer: true },
          { label: 'Sponsored Display (same day)', value: 0, integer: true },
          { label: 'Direct units', value: 0, integer: true },
          { label: 'Subscription units (est.)', value: 0, integer: true },
        ],
      },
      {
        title: 'Advertising cost',
        value: 0,
        currency: true,
        children: [
          { label: 'Sponsored Products', value: 0, currency: true },
          { label: 'Sponsored Brands Video', value: 0, currency: true },
          { label: 'Sponsored Display', value: 0, currency: true },
          { label: 'Sponsored Brands', value: 0, currency: true },
        ],
      },
      {
        title: 'Refund cost',
        value: Math.abs(p.totalRefunds),
        currency: true,
        defaultOpen: true,
        children: [
          { label: 'Refunded amount', value: Math.abs(p.totalRefunds), currency: true },
          { label: 'Refund commission', value: 0, currency: true },
          { label: 'Goodwill/Principal', value: 0, currency: true },
          { label: 'Promotion', value: 0, currency: true },
          { label: 'Refunded referral fee', value: 0, currency: true },
        ],
      },
      {
        title: 'Amazon fees',
        value: Math.abs(p.totalFees),
        currency: true,
        defaultOpen: true,
        children: [
          { label: 'FBA per unit fulfillment fee', value: 0, currency: true },
          { label: 'Referral fee', value: Math.abs(p.totalFees), currency: true },
          { label: 'FBA per unit fulfillment fee_tax', value: 0, currency: true },
          { label: 'Commission_tax', value: 0, currency: true },
          { label: 'Sales tax collection fee', value: 0, currency: true },
          { label: 'FBA disposal fee', value: 0, currency: true },
          { label: 'Sales tax collection fee_tax', value: 0, currency: true },
          { label: 'Fba disposal fee_tax', value: 0, currency: true },
          { label: 'Digital services fee', value: 0, currency: true },
          { label: 'Adjustment FBA per unit fulfillment', value: 0, currency: true },
          { label: 'Reversal reimbursement', value: 0, currency: true },
        ],
      },
      {
        title: 'Cost of goods',
        value: Math.abs(p.totalCOGS),
        currency: true,
        defaultOpen: true,
        children: [
          { label: 'Cost of goods sold', value: Math.abs(p.totalCOGS), currency: true },
          { label: 'Buying price', value: 0, currency: true },
          { label: 'Shipping price', value: 0, currency: true },
          { label: 'Import price', value: 0, currency: true },
          { label: 'Disposal of sellable products', value: 0, currency: true },
          { label: 'Lost/damaged by Amazon', value: 0, currency: true },
          { label: 'Multi-channel', value: 0, currency: true },
          { label: 'Missing returns', value: 0, currency: true },
        ],
      },
    ],
    summaryRows: [
      { label: 'Refunds', value: p.totalRefunds, currency: true },
      { label: 'Promo', value: 0, currency: true },
      { label: 'VAT', value: 0, currency: true },
      { label: 'Gross profit', value: p.grossProfit, currency: true },
      { label: 'Indirect expenses', value: p.totalExpenses, currency: true },
      { label: 'Net profit', value: p.netProfit, currency: true },
      { label: 'Estimated payout', value: 0, currency: true },
      { label: 'Real ACOS', value: 0, percentage: true },
      { label: '% Refunds', value: 0, percentage: true },
      { label: 'Sellable returns', value: 0, percentage: true },
      { label: 'Margin', value: p.netMargin, percentage: true },
      { label: 'ROI', value: roi, percentage: true },
      { label: 'Active subscriptions (SnS)', value: 0, integer: true },
      { label: 'Sessions', value: 0, integer: true },
      { label: 'Unit session percentage', value: 0, percentage: true },
    ],
  }
}

/* ── Component ─────────────────────────────────────────── */

export const SellerboardProductsTable: React.FC<SellerboardProductsTableProps> = React.memo(({
  products,
  isLoading,
  isFetching,
  searchTerm = '',
  error,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('netProfit')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  /* ── StatModal snapshot state ── */
  const [productStat, setProductStat] = useState<{
    data: StatModalData
    anchorRect: DOMRect
  } | null>(null)

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }, [sortColumn, sortDirection])

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return []
    let result = [...products]

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
          aVal = 0
          bVal = 0
          break
        case 'ads':
          aVal = 0
          bVal = 0
          break
        case 'amazonFees':
          aVal = a.totalFees || 0
          bVal = b.totalFees || 0
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
          aVal = a.netMargin || 0
          bVal = b.netMargin || 0
          break
        case 'roi':
          aVal = a.totalCOGS > 0 ? (a.netProfit / a.totalCOGS) * 100 : 0
          bVal = b.totalCOGS > 0 ? (b.netProfit / b.totalCOGS) * 100 : 0
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
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedProducts, currentPage])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => (
    <span className="ml-1 inline-block text-xs">
      {sortColumn === column ? (
        sortDirection === 'asc' ? '▲' : '▼'
      ) : (
        <span className="text-text-muted">⇅</span>
      )}
    </span>
  )

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
      {/* Fetching overlay */}
      {isFetching && (
        <div className="absolute inset-0 bg-surface/60 z-20 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {/* StatModal — fixed position, does NOT scroll with table */}
      <StatModal
        isOpen={!!productStat}
        onClose={() => setProductStat(null)}
        data={productStat?.data || null}
        currency="CAD"
        anchorRect={productStat?.anchorRect || null}
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary max-w-[250px]"
                onClick={() => handleSort('name')}
              >
                Product <SortIcon column="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('units')}
              >
                Units sold <SortIcon column="units" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('refunds')}
              >
                Refunds <SortIcon column="refunds" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('sales')}
              >
                Sales <SortIcon column="sales" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('promo')}
              >
                Promo <SortIcon column="promo" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('ads')}
              >
                Ads <SortIcon column="ads" />
              </TableHead>
              <TableHead className="text-right">Refund cost</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('amazonFees')}
              >
                Amazon fees <SortIcon column="amazonFees" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('cogs')}
              >
                Cost of goods <SortIcon column="cogs" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('grossProfit')}
              >
                Gross profit <SortIcon column="grossProfit" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('netProfit')}
              >
                Net profit <SortIcon column="netProfit" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('margin')}
              >
                Margin <SortIcon column="margin" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('roi')}
              >
                ROI <SortIcon column="roi" />
              </TableHead>
              <TableHead className="text-right">BSR</TableHead>
              <TableHead className="text-center">Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((product: any) => {
              const roi = product.totalCOGS > 0 ? (product.netProfit / product.totalCOGS) * 100 : 0
              const refundCount = product.totalRefunds || 0
              const avgOrderValue = product.unitsSold > 0 ? (product.salesRevenue || 0) / product.unitsSold : 0
              const refundCost = refundCount * avgOrderValue

              return (
                <TableRow
                  key={product.sku}
                  className="hover:bg-surface-secondary transition-colors"
                >
                  <TableCell>
                    <div className="flex items-start gap-3 max-w-[250px]">
                      <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 max-w-[200px]">
                        <div className="text-xs text-text-muted mb-1 truncate">{product.sku}</div>
                        <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
                          {product.productTitle || '-'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <div>
                            <span className="text-text-primary font-medium">
                              {formatCurrency((product.salesRevenue || 0) / Math.max(product.unitsSold || 1, 1))}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted">COGS </span>
                            <span className="text-text-primary font-medium">
                              {formatCurrency((product.cogsRate || 0))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-text-primary font-medium">0</span>
                            <svg className="w-3 h-3 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(product.unitsSold || 0, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(refundCount, 0)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.salesRevenue || 0)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                  <TableCell className="text-right text-danger-600">
                    -{formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(refundCost)}</TableCell>
                  <TableCell className="text-right text-danger-600">
                    -{formatCurrency(product.totalFees || 0)}
                  </TableCell>
                  <TableCell className="text-right text-danger-600">
                    -{formatCurrency(product.totalCOGS || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-success-600">
                    {formatCurrency(product.grossProfit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success-600">
                    {formatCurrency(product.netProfit || 0)}
                  </TableCell>
                  <TableCell className="text-right">{formatPercentage(product.netMargin || 0)}</TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(roi)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-text-muted">—</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setProductStat({
                          data: buildProductStatData(product),
                          anchorRect: rect,
                        })
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      More
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} of{' '}
            {filteredAndSortedProducts.length} products
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})