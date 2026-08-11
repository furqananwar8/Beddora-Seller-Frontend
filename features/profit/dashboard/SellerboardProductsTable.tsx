
'use client'

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
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '@/utils/format'

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

const buildProductStatData = (
  p: ProductProfitBreakdown
): StatModalData => {
  const refundAmount =
    Math.abs(p.refundAmount || 0)

  const refundCount =
    p.totalRefunds || 0

  const refundCost =
    Math.abs(p.refundCost || 0)

  const totalFees =
    Math.abs(p.totalFees || 0)

  const fbaFees =
    Math.abs(p.fbaFees || 0)

  const fbaFulfillmentFee =
    Math.abs(
      p.fbaFulfillmentFee || 0
    )

  const salesTaxServiceFees =
    Math.abs(
      p.salesTaxServiceFees || 0
    )

  const promoRebates =
    Math.abs(
      p.promoRebates || 0
    )

  const reversalReimbursements =
    Math.abs(
      p.reversalReimbursements || 0
    )

  const sellingFees =
    Math.abs(
      p.sellingFees || 0
    )

  const otherAmazonAdjustments =
    Math.abs(
      p.otherAmazonAdjustments || 0
    )

  const advertisingCost =
    Math.abs(
      p.advertisingCost || 0
    )

  const totalCOGS =
    Math.abs(p.totalCOGS || 0)

  return {
    title:
      p.productTitle ||
      p.sku ||
      'Product',

    sections: [
      {
        title: 'Sales',
        value: p.salesRevenue,
        currency: true,
        defaultOpen: true,

        children: [
          {
            label: 'Sales',
            value: p.salesRevenue,
            currency: true,
          },
        ],
      },

      {
        title: 'Units',
        value: p.unitsSold,
        defaultOpen: true,

        children: [
          {
            label: 'Units sold',
            value: p.unitsSold,
            integer: true,
          },
        ],
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
        ],
      },

      {
        title: 'Refund cost',
        value: refundCost,
        currency: true,
        defaultOpen: true,

        children: [
          {
            label: 'Refunded amount',
            value: refundAmount,
            currency: true,
          },
          {
            label: 'Refund count',
            value: refundCount,
            integer: true,
          },
        ],
      },

      {
        title: 'Amazon fees',
        value: totalFees,
        currency: true,
        defaultOpen: true,

        children: [
          {
            label: 'FBA fees',
            value: fbaFees,
            currency: true,
          },
          {
            label:
              'FBA per unit fulfillment fee',
            value: fbaFulfillmentFee,
            currency: true,
          },
          {
            label: 'Selling fees',
            value: sellingFees,
            currency: true,
          },
          {
            label:
              'Sales tax collection fee',
            value: salesTaxServiceFees,
            currency: true,
          },
          {
            label: 'Promo / rebates',
            value: promoRebates,
            currency: true,
          },
          {
            label:
              'Reversal reimbursement',
            value:
              reversalReimbursements,
            currency: true,
          },
          {
            label:
              'Other Amazon adjustments',
            value:
              otherAmazonAdjustments,
            currency: true,
          },
        ],
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
          {
            label: 'Buying price',
            value: 0,
            currency: true,
          },
          {
            label: 'Shipping price',
            value: 0,
            currency: true,
          },
          {
            label: 'Import price',
            value: 0,
            currency: true,
          },
        ],
      },
    ],

    summaryRows: [
      {
        label: 'Refunds',
        value: refundCost,
        currency: true,
      },

      {
        label: 'Promo',
        value: promoRebates,
        currency: true,
      },

      {
        label: 'VAT',
        value: 0,
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
        label: 'Estimated payout',
        value: 0,
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
            ? (refundAmount /
                p.salesRevenue) *
              100
            : 0,
        percentage: true,
      },

      {
        label: 'Sellable returns',
        value: 0,
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

      {
        label: 'Active subscriptions (SnS)',
        value: 0,
        integer: true,
      },

      {
        label: 'Sessions',
        value: 0,
        integer: true,
      },

      {
        label: 'Unit session percentage',
        value: 0,
        percentage: true,
      },
    ],
  }
}

/* ── Component ─────────────────────────────────────────── */

export const SellerboardProductsTable: React.FC<
  SellerboardProductsTableProps
> = React.memo(({
  products,
  isLoading,
  isFetching,
  searchTerm = '',
  error,
}) => {
  const [sortColumn, setSortColumn] =
    useState<SortColumn>('netProfit')

  const [sortDirection, setSortDirection] =
    useState<SortDirection>('desc')

  const [currentPage, setCurrentPage] =
    useState(1)

  const itemsPerPage = 20

  /* ── StatModal snapshot state ── */

  const [productStat, setProductStat] = useState<{
    data: StatModalData
    anchorRect: DOMRect
  } | null>(null)

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection(
          sortDirection === 'asc'
            ? 'desc'
            : 'asc'
        )
      } else {
        setSortColumn(column)
        setSortDirection('desc')
      }
    },
    [sortColumn, sortDirection]
  )

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return []

    let result = [...products]

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()

      result = result.filter(
        (product) =>
          product.productTitle
            ?.toLowerCase()
            .includes(lower) ||
          product.sku
            ?.toLowerCase()
            .includes(lower)
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

      if (aVal < bVal) {
        return sortDirection === 'asc'
          ? -1
          : 1
      }

      if (aVal > bVal) {
        return sortDirection === 'asc'
          ? 1
          : -1
      }

      return 0
    })

    return result
  }, [
    products,
    searchTerm,
    sortColumn,
    sortDirection,
  ])

  const paginatedProducts = useMemo(() => {
    const startIndex =
      (currentPage - 1) * itemsPerPage

    return filteredAndSortedProducts.slice(
      startIndex,
      startIndex + itemsPerPage
    )
  }, [
    filteredAndSortedProducts,
    currentPage,
  ])

  const totalPages = Math.ceil(
    filteredAndSortedProducts.length /
      itemsPerPage
  )

  const SortIcon: React.FC<{
    column: SortColumn
  }> = ({ column }) => (
    <span className="ml-1 inline-block text-xs">
      {sortColumn === column ? (
        sortDirection === 'asc'
          ? '▲'
          : '▼'
      ) : (
        <span className="text-text-muted">
          ⇅
        </span>
      )}
    </span>
  )

  if (isLoading) {
    return (
      <TableSkeleton
        rows={10}
        columns={15}
      />
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-danger-600">
        Failed to load products. Please try again.
      </div>
    )
  }

  if (
    !paginatedProducts.length &&
    !isFetching
  ) {
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
        anchorRect={
          productStat?.anchorRect || null
        }
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary max-w-[250px]"
                onClick={() =>
                  handleSort('name')
                }
              >
                Product{' '}
                <SortIcon column="name" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('units')
                }
              >
                Units sold{' '}
                <SortIcon column="units" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('refunds')
                }
              >
                Refunds{' '}
                <SortIcon column="refunds" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('sales')
                }
              >
                Sales{' '}
                <SortIcon column="sales" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('promo')
                }
              >
                Promo{' '}
                <SortIcon column="promo" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('ads')
                }
              >
                Ads{' '}
                <SortIcon column="ads" />
              </TableHead>

              <TableHead className="text-right">
                Refund cost
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('amazonFees')
                }
              >
                Amazon fees{' '}
                <SortIcon column="amazonFees" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('cogs')
                }
              >
                Cost of goods{' '}
                <SortIcon column="cogs" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('grossProfit')
                }
              >
                Gross profit{' '}
                <SortIcon column="grossProfit" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('netProfit')
                }
              >
                Net profit{' '}
                <SortIcon column="netProfit" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('margin')
                }
              >
                Margin{' '}
                <SortIcon column="margin" />
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() =>
                  handleSort('roi')
                }
              >
                ROI{' '}
                <SortIcon column="roi" />
              </TableHead>

              <TableHead className="text-right">
                BSR
              </TableHead>

              <TableHead className="text-center">
                Info
              </TableHead>

            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedProducts.map(
              (product: ProductProfitBreakdown) => {
                const roi =
                  product.totalCOGS > 0
                    ? (product.netProfit /
                        product.totalCOGS) *
                      100
                    : 0

                const refundCount =
                  product.totalRefunds || 0

                /*
                 * Use the actual refund amount from
                 * the backend instead of calculating:
                 *
                 * refundCount × averageOrderValue
                 */
                const refundCost =
                  Math.abs(
                    product.refundAmount || 0
                  )

                return (
                  <TableRow
                    key={product.sku}
                    className="hover:bg-surface-secondary transition-colors"
                  >

                    {/* Product */}
                    <TableCell>
                      <div className="flex items-start gap-3 max-w-[250px]">

                        <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={
                                product.productTitle ||
                                product.sku ||
                                'Product'
                              }
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

                          <div className="text-xs text-text-muted mb-1 truncate">
                            {product.sku}
                          </div>

                          <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
                            {product.productTitle ||
                              '-'}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">

                            <div>
                              <span className="text-text-primary font-medium">
                                {formatCurrency(
                                  (product.salesRevenue ||
                                    0) /
                                    Math.max(
                                      product.unitsSold ||
                                        1,
                                      1
                                    )
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-text-muted">
                                COGS{' '}
                              </span>

                              <span className="text-text-primary font-medium">
                                {formatCurrency(
                                  product.cogsRate ||
                                    0
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-text-primary font-medium">
                                {formatCurrency(
                                  Math.abs(
                                    product.promoRebates ||
                                      0
                                  )
                                )}
                              </span>

                              <svg
                                className="w-3 h-3 text-danger-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>

                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Units sold */}
                    <TableCell className="text-right">
                      {formatNumber(
                        product.unitsSold || 0,
                        0
                      )}
                    </TableCell>

                    {/* Refund count */}
                    <TableCell className="text-right">
                      {formatNumber(
                        refundCount,
                        0
                      )}
                    </TableCell>

                    {/* Sales */}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        product.salesRevenue || 0
                      )}
                    </TableCell>

                    {/* Promo */}
                    <TableCell className="text-right">
                      {formatCurrency(
                        Math.abs(
                          product.promoRebates || 0
                        )
                      )}
                    </TableCell>

                    {/* Ads */}
                    <TableCell className="text-right text-danger-600">
                      -{formatCurrency(
                        Math.abs(product.advertisingCost || 0)
                      )}
                    </TableCell>

                    {/* Refund cost */}
                   <TableCell className="text-right">
                      {formatCurrency(
                        Math.abs(product.refundCost || 0)
                      )}
                    </TableCell>

                    {/* Amazon fees */}
                    <TableCell className="text-right text-danger-600">
                      -{formatCurrency(
                        Math.abs(
                          product.totalFees || 0
                        )
                      )}
                    </TableCell>

                    {/* Cost of goods */}
                    <TableCell className="text-right text-danger-600">
                      -{formatCurrency(
                        Math.abs(
                          product.totalCOGS || 0
                        )
                      )}
                    </TableCell>

                    {/* Gross profit */}
                    <TableCell className="text-right font-medium text-success-600">
                      {formatCurrency(
                        product.grossProfit || 0
                      )}
                    </TableCell>

                    {/* Net profit */}
                    <TableCell className="text-right font-semibold text-success-600">
                      {formatCurrency(
                        product.netProfit || 0
                      )}
                    </TableCell>

                    {/* Margin */}
                   <TableCell className="text-right">
                      {formatPercentage(
                        product.margin || 0
                      )}
                    </TableCell>

                    {/* ROI */}
                    <TableCell className="text-right">
                      {formatPercentage(
                        product.roi || 0
                      )}
                    </TableCell>

                    {/* BSR */}
                    <TableCell className="text-right">
                      <span className="text-text-muted">
                        —
                      </span>
                    </TableCell>

                    {/* Info */}
                    <TableCell className="text-center">
                      <button
                        onClick={(e) => {
                          const rect =
                            (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect()

                          setProductStat({
                            data:
                              buildProductStatData(
                                product
                              ),
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
              }
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">

          <div className="text-sm text-text-muted">
            Showing{' '}
            {(currentPage - 1) *
              itemsPerPage +
              1}{' '}
            to{' '}
            {Math.min(
              currentPage * itemsPerPage,
              filteredAndSortedProducts.length
            )}{' '}
            of{' '}
            {filteredAndSortedProducts.length}{' '}
            products
          </div>

          <div className="flex gap-2">

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from(
                {
                  length: Math.min(
                    5,
                    totalPages
                  ),
                },
                (_, i) => {
                  let pageNum

                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (
                    currentPage <= 3
                  ) {
                    pageNum = i + 1
                  } else if (
                    currentPage >=
                    totalPages - 2
                  ) {
                    pageNum =
                      totalPages - 4 + i
                  } else {
                    pageNum =
                      currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() =>
                        setCurrentPage(
                          pageNum
                        )
                      }
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
                setCurrentPage((p) =>
                  Math.min(
                    totalPages,
                    p + 1
                  )
                )
              }
              disabled={
                currentPage === totalPages
              }
            >
              Next
            </Button>

          </div>
        </div>
      )}
    </div>
  )
})
