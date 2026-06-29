"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Modal } from '@/design-system/modals'
import { TableSkeleton } from '@/design-system/loaders'
import { ProductProfitBreakdown } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'

export interface TopProductsTableProps {
  products?: ProductProfitBreakdown[]
  isLoading?: boolean
  error?: any
}

type SortColumn = 'name' | 'sku' | 'units' | 'revenue' | 'profit' | 'margin'
type SortDirection = 'asc' | 'desc'

export const TopProductsTable: React.FC<TopProductsTableProps> = ({ products, isLoading, error }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductProfitBreakdown | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('revenue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return []
    let result = [...products]

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (product) =>
          product.productTitle?.toLowerCase().includes(lower) ||
          product.sku?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortColumn) {
        case 'name':
          aVal = a.productTitle || ''
          bVal = b.productTitle || ''
          break
        case 'sku':
          aVal = a.sku || ''
          bVal = b.sku || ''
          break
        case 'units':
          aVal = a.unitsSold || 0
          bVal = b.unitsSold || 0
          break
        case 'revenue':
          aVal = a.salesRevenue || 0
          bVal = b.salesRevenue || 0
          break
        case 'profit':
          aVal = a.netProfit || 0
          bVal = b.netProfit || 0
          break
        case 'margin':
          aVal = a.netMargin || 0
          bVal = b.netMargin || 0
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
    <span className="ml-1 inline-block">
      {sortColumn === column ? (
        sortDirection === 'asc' ? '↑' : '↓'
      ) : (
        <span className="text-text-muted">↕</span>
      )}
    </span>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Top Products</CardTitle>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton rows={5} columns={7} />}
        {error && <div className="text-sm text-danger-600">Failed to load products</div>}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('name')}
                  >
                    Product
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('sku')}
                  >
                    SKU
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('units')}
                  >
                    Units Sold
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('revenue')}
                  >
                    Revenue
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('profit')}
                  >
                    Profit
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('margin')}
                  >
                    Margin
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => (
                    <TableRow
                      key={product.sku}
                      className="cursor-pointer hover:bg-surface-secondary transition-colors"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-text-primary">
                            {product.productTitle || 'Unnamed Product'}
                          </div>
                          <div className="text-xs text-text-muted">—</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">{product.sku}</TableCell>
                      <TableCell>{formatNumber(product.unitsSold || 0, 0)}</TableCell>
                      <TableCell>{formatCurrency(product.salesRevenue || 0)}</TableCell>
                      <TableCell className="text-success-600">
                        {formatCurrency(product.netProfit || 0)}
                      </TableCell>
                      <TableCell>{formatPercentage(product.netMargin || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={product.salesRevenue > 0 ? 'success' : 'secondary'}>
                          {product.salesRevenue > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
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
          </>
        )}
      </CardContent>
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Product Profit Details"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-3">
            <div>
              <div className="text-sm text-text-muted">Product</div>
              <div className="text-base font-semibold text-text-primary">
                {selectedProduct.productTitle || 'Unnamed Product'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-text-muted">SKU</div>
                <div className="text-sm text-text-primary">{selectedProduct.sku}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Units Sold</div>
                <div className="text-sm text-text-primary">
                  {formatNumber(selectedProduct.unitsSold || 0, 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Revenue</div>
                <div className="text-sm text-text-primary">
                  {formatCurrency(selectedProduct.salesRevenue || 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Profit</div>
                <div className="text-sm text-success-600">
                  {formatCurrency(selectedProduct.netProfit || 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Total Costs</div>
                <div className="text-sm text-text-primary">
                  {formatCurrency(
                    selectedProduct.totalExpenses +
                      selectedProduct.totalFees +
                      selectedProduct.totalCOGS
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Margin</div>
                <div className="text-sm text-text-primary">
                  {formatPercentage(selectedProduct.netMargin || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}

