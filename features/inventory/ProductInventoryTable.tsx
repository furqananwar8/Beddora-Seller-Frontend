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
import { ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Badge } from '@/design-system/badges'

export interface ProductInventoryTableProps {
  products?: ProductInventoryItem[]
  isLoading?: boolean
  searchTerm?: string
  error?: any
  selectedProducts: string[]
  onProductSelect: (productId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
}

type SortColumn =
  | 'title'
  | 'fbaFbmStock'
  | 'reserved'
  | 'salesVelocity'
  | 'daysOfStockLeft'
  | 'sentToFba'
  | 'prepCenterStock'
  | 'ordered'
  | 'daysUntilNextOrder'
  | 'recommendedQuantity'
  | 'stockValue'
  | 'roi'
type SortDirection = 'asc' | 'desc'

/**
 * Product Inventory Table Component
 * 
 * Displays product inventory with stock levels, recommendations, and actions
 */
export const ProductInventoryTable = ({
  products,
  isLoading,
  searchTerm = '',
  error,
  selectedProducts,
  onProductSelect,
  onSelectAll,
}: ProductInventoryTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('daysOfStockLeft')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
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

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return []
    let result = [...products]

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (product) =>
          product.title?.toLowerCase().includes(lower) ||
          product.sku?.toLowerCase().includes(lower) ||
          product.asin?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortColumn) {
        case 'title':
          aVal = a.title || ''
          bVal = b.title || ''
          break
        case 'fbaFbmStock':
          aVal = a.fbaFbmStock || 0
          bVal = b.fbaFbmStock || 0
          break
        case 'reserved':
          aVal = a.reserved || 0
          bVal = b.reserved || 0
          break
        case 'salesVelocity':
          aVal = a.salesVelocity || 0
          bVal = b.salesVelocity || 0
          break
        case 'daysOfStockLeft':
          aVal = a.daysOfStockLeft || 0
          bVal = b.daysOfStockLeft || 0
          break
        case 'sentToFba':
          aVal = a.sentToFba || 0
          bVal = b.sentToFba || 0
          break
        case 'prepCenterStock':
          aVal = a.prepCenterStock || 0
          bVal = b.prepCenterStock || 0
          break
        case 'ordered':
          aVal = a.ordered || 0
          bVal = b.ordered || 0
          break
        case 'daysUntilNextOrder':
          aVal = a.daysUntilNextOrder || 0
          bVal = b.daysUntilNextOrder || 0
          break
        case 'recommendedQuantity':
          aVal = a.recommendedQuantity || 0
          bVal = b.recommendedQuantity || 0
          break
        case 'stockValue':
          aVal = a.stockValue || 0
          bVal = b.stockValue || 0
          break
        case 'roi':
          aVal = a.roi || 0
          bVal = b.roi || 0
          break
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })

    return result
  }, [products, searchTerm, sortColumn, sortDirection])

  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return filteredAndSortedProducts.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredAndSortedProducts, currentPage])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)

  const allSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProducts.includes(p.id))

  const getDaysLeftBadge = (days: number) => {
    if (days <= 0) return <Badge variant="error">{days}</Badge>
    if (days < 7) return <Badge variant="warning">{days}</Badge>
    if (days < 30) return <Badge variant="success">{days}</Badge>
    return <Badge variant="primary">{days}</Badge>
  }

  const getStockLevelIndicator = (stock: number, velocity: number) => {
    const daysLeft = velocity > 0 ? stock / velocity : 999
    if (daysLeft === 0) return <span className="text-danger-600">●</span>
    if (daysLeft < 7) return <span className="text-warning-600">●</span>
    return <span className="text-success-600">●</span>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-text-danger">Error loading products: {error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return <TableSkeleton rows={10} columns={15} />
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-text-muted">No products found</p>
      </div>
    )
  }

  if (filteredAndSortedProducts.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-text-muted">No products match your search</p>
      </div>
    )
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <span className="ml-1 text-text-tertiary">↕</span>
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-border-primary"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary min-w-[250px]"
                  onClick={() => handleSort('title')}
                >
                  Product <SortIcon column="title" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('fbaFbmStock')}
                >
                  FBA/FBM stock <SortIcon column="fbaFbmStock" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('reserved')}
                >
                  Reserved <SortIcon column="reserved" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('salesVelocity')}
                >
                  Sales velocity <SortIcon column="salesVelocity" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('daysOfStockLeft')}
                >
                  Days of stock left <SortIcon column="daysOfStockLeft" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('sentToFba')}
                >
                  Sent to FBA <SortIcon column="sentToFba" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('prepCenterStock')}
                >
                  Prep center 1 stock <SortIcon column="prepCenterStock" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('ordered')}
                >
                  Ordered <SortIcon column="ordered" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('daysUntilNextOrder')}
                >
                  Days until next order <SortIcon column="daysUntilNextOrder" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('recommendedQuantity')}
                >
                  Recommended quantity <SortIcon column="recommendedQuantity" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('stockValue')}
                >
                  Stock value <SortIcon column="stockValue" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('roi')}
                >
                  ROI <SortIcon column="roi" />
                </TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => onProductSelect(product.id, e.target.checked)}
                      className="rounded border-border-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-surface-secondary rounded flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary truncate max-w-xs">
                          {product.title}
                        </div>
                        <div className="text-xs text-text-muted">
                          {product.sku} • {product.asin}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getStockLevelIndicator(product.fbaFbmStock, product.salesVelocity)}
                      <span>{formatNumber(product.fbaFbmStock)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(product.reserved)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(product.salesVelocity, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getDaysLeftBadge(product.daysOfStockLeft)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-primary-600">{formatNumber(product.sentToFba)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(product.prepCenterStock)}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(product.ordered)}</TableCell>
                  <TableCell className="text-right">
                    {getDaysLeftBadge(product.daysUntilNextOrder)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-primary-600">
                      {formatNumber(product.recommendedQuantity)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.stockValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.roi >= 50
                          ? 'text-text-success'
                          : product.roi >= 20
                          ? 'text-text-warning'
                          : 'text-text-muted'
                      }
                    >
                      {product.roi}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted max-w-xs truncate">
                    {product.comment || '—'}
                  </TableCell>
                  <TableCell>
                    <button className="text-text-muted hover:text-text-primary">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} of{' '}
            {filteredAndSortedProducts.length} products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
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
