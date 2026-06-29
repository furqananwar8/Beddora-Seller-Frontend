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
import { TableSkeleton } from '@/design-system/loaders'
import { OrderItemProfitBreakdown } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'

export interface OrderItemsTableProps {
  orderItems?: OrderItemProfitBreakdown[]
  isLoading?: boolean
  searchTerm?: string
  error?: any
}

type SortColumn =
  | 'orderNumber'
  | 'orderDate'
  | 'product'
  | 'unitsSold'
  | 'refunds'
  | 'sales'
  | 'sellableReturns'
  | 'amazonFees'
  | 'grossProfit'
  | 'expenses'
  | 'netProfit'
type SortDirection = 'asc' | 'desc'

/**
 * Order Items Table Component
 * 
 * Displays individual order items with profit metrics
 */
export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  orderItems,
  isLoading,
  searchTerm = '',
  error,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }, [sortColumn, sortDirection])

  const filteredAndSortedItems = useMemo(() => {
    if (!orderItems) return []
    let result = [...orderItems]

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.orderNumber?.toLowerCase().includes(lower) ||
          item.productTitle?.toLowerCase().includes(lower) ||
          item.sku?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortColumn) {
        case 'orderNumber':
          aVal = a.orderNumber || ''
          bVal = b.orderNumber || ''
          break
        case 'orderDate':
          aVal = new Date(a.orderDate).getTime()
          bVal = new Date(b.orderDate).getTime()
          break
        case 'product':
          aVal = a.productTitle || ''
          bVal = b.productTitle || ''
          break
        case 'unitsSold':
          aVal = a.quantity || 0
          bVal = b.quantity || 0
          break
        case 'refunds':
          aVal = a.refundCount || 0
          bVal = b.refundCount || 0
          break
        case 'sales':
          aVal = a.salesRevenue || 0
          bVal = b.salesRevenue || 0
          break
        case 'sellableReturns':
          aVal = a.sellableReturnsPercent || 0
          bVal = b.sellableReturnsPercent || 0
          break
        case 'amazonFees':
          aVal = a.amazonFees || 0
          bVal = b.amazonFees || 0
          break
        case 'grossProfit':
          aVal = a.grossProfit || 0
          bVal = b.grossProfit || 0
          break
        case 'expenses':
          aVal = a.expenses || 0
          bVal = b.expenses || 0
          break
        case 'netProfit':
          aVal = a.netProfit || 0
          bVal = b.netProfit || 0
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [orderItems, searchTerm, sortColumn, sortDirection])

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedItems, currentPage])

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => (
    <span className="ml-1 inline-block text-xs">
      {sortColumn === column ? (
        sortDirection === 'asc' ? '▲' : '▼'
      ) : (
        <span className="text-text-muted">⇅</span>
      )}
    </span>
  )

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getShippingStatusIcon = (status: string) => {
    if (status.toLowerCase() === 'unshipped' || status.toLowerCase() === 'pending') {
      return (
        <svg
          className="w-4 h-4 text-warning-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )
    }
    return null
  }

  if (isLoading) {
    return <TableSkeleton rows={10} columns={13} />
  }

  if (error) {
    return (
      <div className="text-center py-8 text-danger-600">
        Failed to load order items. Please try again.
      </div>
    )
  }

  if (!paginatedItems.length) {
    return (
      <div className="text-center py-8 text-text-muted">
        No order items found for this period.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary min-w-[280px]"
                onClick={() => handleSort('orderNumber')}
              >
                Order number
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary max-w-[250px]"
                onClick={() => handleSort('product')}
              >
                Product
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('unitsSold')}
              >
                Units sold
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('refunds')}
              >
                Refunds
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('sales')}
              >
                Sales
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('sellableReturns')}
              >
                Sellable returns
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('amazonFees')}
              >
                Amazon fees
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('grossProfit')}
              >
                Gross profit
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('expenses')}
              >
                Expenses
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-surface-secondary text-right"
                onClick={() => handleSort('netProfit')}
              >
                Net profit
              </TableHead>
              <TableHead className="text-left">Coupon</TableHead>
              <TableHead className="text-left">Comment</TableHead>
              <TableHead className="text-center">Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-surface-secondary transition-colors"
                >
                  {/* Order Number Column */}
                  <TableCell>
                    <div className="space-y-1 min-w-[280px]">
                      {/* Order ID */}
                      <div className="text-sm font-medium text-text-primary">
                        {item.orderNumber}
                      </div>
                      {/* Marketplace */}
                      <div className="text-xs text-text-muted">
                        {item.marketplace}
                      </div>
                      {/* Date and Time */}
                      <div className="text-xs text-text-muted">
                        {formatOrderDate(item.orderDate)}
                      </div>
                      {/* Shipping Status */}
                      <div className="flex items-center gap-1.5">
                        {getShippingStatusIcon(item.orderStatus)}
                        <span className="text-xs text-text-muted capitalize">
                          {item.orderStatus}
                        </span>
                      </div>
                      {/* COGS */}
                      <div className="text-xs">
                        <span className="text-text-muted">COGS </span>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(item.cogs, item.currency)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Product Column */}
                  <TableCell>
                    <div className="flex items-start gap-3 max-w-[250px]">
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productTitle || 'Product'}
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
                      
                      {/* Product Details */}
                      <div className="min-w-0 flex-1 max-w-[200px]">
                        {/* SKU */}
                        <div className="text-xs text-text-muted mb-0.5 truncate">{item.sku}</div>
                        {/* Product Name */}
                        <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
                          {item.productTitle || 'Unnamed Product'}
                        </div>
                        {/* Selling Price */}
                        <div className="text-xs">
                          <span className="text-text-primary font-medium">
                            {formatCurrency(item.unitPrice, item.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">{formatNumber(item.quantity, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.refundCount, 0)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.salesRevenue, item.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(item.sellableReturnsPercent)}
                  </TableCell>
                  <TableCell className="text-right text-danger-600">
                    -{formatCurrency(item.amazonFees, item.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-success-600">
                    {formatCurrency(item.grossProfit, item.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.expenses, item.currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success-600">
                    {formatCurrency(item.netProfit, item.currency)}
                  </TableCell>
                  <TableCell className="text-left">
                    {item.coupon ? (
                      <span className="text-xs text-text-primary">{item.coupon}</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {item.comment ? (
                      <span className="text-xs text-text-primary">{item.comment}</span>
                    ) : (
                      <button className="text-xs text-primary-600 hover:text-primary-700 hover:underline">
                        Add
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      More
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of{' '}
            {filteredAndSortedItems.length} order items
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
}
