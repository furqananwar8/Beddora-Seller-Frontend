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
import { ProductRepricingData, RepricingStatus, BuyBoxStatus } from '@/services/api/repricer.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { Badge } from '@/design-system/badges'

export interface RepricerProductsTableProps {
  products?: ProductRepricingData[]
  isLoading?: boolean
  searchTerm?: string
  error?: any
  onProductClick?: (product: ProductRepricingData) => void
}

type SortColumn =
  | 'title'
  | 'currentPrice'
  | 'minPrice'
  | 'maxPrice'
  | 'competitorCount'
  | 'lowestCompetitorPrice'
  | 'buyBoxPrice'
  | 'buyBoxStatus'
  | 'salesVelocity'
  | 'currentMargin'
  | 'priceChangeCount'
  | 'lastRepriced'
type SortDirection = 'asc' | 'desc'

/**
 * Repricer Products Table Component
 * 
 * Displays products with repricing data, competitor info, and Buy Box status
 */
export const RepricerProductsTable = ({
  products,
  isLoading,
  searchTerm = '',
  error,
  onProductClick,
}: RepricerProductsTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('lastRepriced')
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
        case 'currentPrice':
          aVal = a.currentPrice || 0
          bVal = b.currentPrice || 0
          break
        case 'minPrice':
          aVal = a.minPrice || 0
          bVal = b.minPrice || 0
          break
        case 'maxPrice':
          aVal = a.maxPrice || 0
          bVal = b.maxPrice || 0
          break
        case 'competitorCount':
          aVal = a.competitorCount || 0
          bVal = b.competitorCount || 0
          break
        case 'lowestCompetitorPrice':
          aVal = a.lowestCompetitorPrice || 0
          bVal = b.lowestCompetitorPrice || 0
          break
        case 'buyBoxPrice':
          aVal = a.buyBoxPrice || 0
          bVal = b.buyBoxPrice || 0
          break
        case 'buyBoxStatus':
          aVal = a.buyBoxStatus || ''
          bVal = b.buyBoxStatus || ''
          break
        case 'salesVelocity':
          aVal = a.salesVelocity || 0
          bVal = b.salesVelocity || 0
          break
        case 'currentMargin':
          aVal = a.currentMargin || 0
          bVal = b.currentMargin || 0
          break
        case 'priceChangeCount':
          aVal = a.priceChangeCount || 0
          bVal = b.priceChangeCount || 0
          break
        case 'lastRepriced':
          aVal = new Date(a.lastRepriced || 0).getTime()
          bVal = new Date(b.lastRepriced || 0).getTime()
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

  const getBuyBoxStatusBadge = (status: BuyBoxStatus) => {
    switch (status) {
      case 'won':
        return <Badge variant="success">Won</Badge>
      case 'lost':
        return <Badge variant="error">Lost</Badge>
      case 'ineligible':
        return <Badge variant="warning">Ineligible</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusBadge = (status: RepricingStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'paused':
        return <Badge variant="warning">Paused</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-text-danger">Error loading products: {error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return <TableSkeleton rows={10} columns={12} />
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
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('title')}
                >
                  Product <SortIcon column="title" />
                </TableHead>
                <TableHead>SKU/ASIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('currentPrice')}
                >
                  Current Price <SortIcon column="currentPrice" />
                </TableHead>
                <TableHead className="text-right">Min/Max</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('lowestCompetitorPrice')}
                >
                  Lowest Competitor <SortIcon column="lowestCompetitorPrice" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('buyBoxPrice')}
                >
                  Buy Box Price <SortIcon column="buyBoxPrice" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('buyBoxStatus')}
                >
                  Buy Box <SortIcon column="buyBoxStatus" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('competitorCount')}
                >
                  Competitors <SortIcon column="competitorCount" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('salesVelocity')}
                >
                  Sales/Day <SortIcon column="salesVelocity" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('currentMargin')}
                >
                  Margin <SortIcon column="currentMargin" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('priceChangeCount')}
                >
                  Price Changes <SortIcon column="priceChangeCount" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('lastRepriced')}
                >
                  Last Repriced <SortIcon column="lastRepriced" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className={onProductClick ? 'cursor-pointer hover:bg-surface-secondary' : ''}
                  onClick={() => onProductClick?.(product)}
                >
                  <TableCell className="font-medium max-w-xs truncate">
                    {product.title}
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    <div>{product.sku}</div>
                    <div className="text-xs">{product.asin}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(product.status)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(product.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-muted">
                    <div>{formatCurrency(product.minPrice)}</div>
                    <div>{formatCurrency(product.maxPrice)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.lowestCompetitorPrice > 0
                      ? formatCurrency(product.lowestCompetitorPrice)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.buyBoxPrice > 0 ? formatCurrency(product.buyBoxPrice) : '-'}
                  </TableCell>
                  <TableCell>{getBuyBoxStatusBadge(product.buyBoxStatus)}</TableCell>
                  <TableCell className="text-right">{product.competitorCount}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(product.salesVelocity, 1)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.currentMargin >= 20
                          ? 'text-text-success'
                          : product.currentMargin >= 10
                          ? 'text-text-warning'
                          : 'text-text-danger'
                      }
                    >
                      {formatPercentage(product.currentMargin)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="primary">{product.priceChangeCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {formatDate(product.lastRepriced)}
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
