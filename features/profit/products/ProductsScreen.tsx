'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetProfitByProductQuery } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { TableSkeleton } from '@/design-system/loaders'

type SortColumn = 'product' | 'cogs' | 'profitPerUnit' | 'tags'
type SortDirection = 'asc' | 'desc'

export const ProductsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('product')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [groupBy, setGroupBy] = useState('product')
  const [showHidden, setShowHidden] = useState(false)

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id

  // Get default date range (last 30 days)
  const dateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }, [])

  const { data: productsData, isLoading } = useGetProfitByProductQuery(
    {
      ...profitFilters,
      accountId: effectiveAccountId,
      ...dateRange,
    },
    { skip: !effectiveAccountId }
  )

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const toggleProductSelection = (sku: string) => {
    const newSet = new Set(selectedProducts)
    if (newSet.has(sku)) {
      newSet.delete(sku)
    } else {
      newSet.add(sku)
    }
    setSelectedProducts(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredAndSortedProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredAndSortedProducts.map((p) => p.sku)))
    }
  }

  const filteredAndSortedProducts = useMemo(() => {
    if (!productsData) return []
    let result = [...productsData]

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (product) =>
          product.productTitle?.toLowerCase().includes(lower) ||
          product.sku?.toLowerCase().includes(lower) ||
          product.productId?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = 0
      let bVal: any = 0

      switch (sortColumn) {
        case 'product':
          aVal = a.productTitle || a.sku || ''
          bVal = b.productTitle || b.sku || ''
          break
        case 'cogs':
          aVal = a.totalCOGS || 0
          bVal = b.totalCOGS || 0
          break
        case 'profitPerUnit':
          aVal = a.unitsSold > 0 ? (a.netProfit / a.unitsSold) : 0
          bVal = b.unitsSold > 0 ? (b.netProfit / b.unitsSold) : 0
          break
        default:
          aVal = 0
          bVal = 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [productsData, searchTerm, sortColumn, sortDirection])

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export products')
  }

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import products')
  }

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log('Refresh products')
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save changes')
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Products</h1>
      </div>

      {/* Top Toolbar - Search and Filters */}
      <div className="bg-surface border-b border-border mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* More Filters Dropdown */}
            <Select
              value="more-filters"
              onChange={() => undefined}
              options={[
                { value: 'more-filters', label: 'More filters' },
                { value: 'tags', label: 'Filter by Tags' },
                { value: 'cogs', label: 'Filter by COGS' },
              ]}
              className="min-w-[140px]"
            />

            {/* Filter Button */}
            <Button variant="primary">Filter</Button>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left Side - Group By */}
            <div className="flex items-center gap-3">
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                options={[
                  { value: 'product', label: 'Group by product' },
                  { value: 'parent', label: 'Group by parent' },
                  { value: 'category', label: 'Group by category' },
                  { value: 'brand', label: 'Group by brand' },
                  { value: 'supplier', label: 'Group by supplier' },
                ]}
                className="min-w-[180px]"
              />
            </div>

            {/* Right Side - Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={handleImport}>
                Import
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                Export
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
              >
                {showHidden ? 'Hide Hidden' : 'Show Hidden'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedProducts.size === 0}
              >
                Hide
              </Button>
              <Button variant="secondary" size="sm" disabled={selectedProducts.size === 0}>
                Create multi-product batch
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRefresh}>
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={10} columns={8} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredAndSortedProducts.length}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-surface-secondary min-w-[350px]"
                      onClick={() => handleSort('product')}
                    >
                      Product
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Tags</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-surface-secondary text-right whitespace-nowrap"
                      onClick={() => handleSort('cogs')}
                    >
                      COGS
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      Value of unsellable returns (%)
                    </TableHead>
                    <TableHead className="text-center w-12">
                      <svg className="w-4 h-4 mx-auto text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Shipping profile</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-surface-secondary text-right whitespace-nowrap"
                      onClick={() => handleSort('profitPerUnit')}
                    >
                      Profit per unit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.map((product) => {
                      const profitPerUnit =
                        product.unitsSold > 0 ? product.netProfit / product.unitsSold : 0
                      const unitPrice =
                        product.unitsSold > 0 ? product.salesRevenue / product.unitsSold : 0
                      const cogsPerUnit =
                        product.unitsSold > 0 ? product.totalCOGS / product.unitsSold : 0

                      return (
                        <TableRow key={product.sku} className="hover:bg-surface-secondary">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.sku)}
                              onChange={() => toggleProductSelection(product.sku)}
                              className="cursor-pointer"
                            />
                          </TableCell>

                          {/* Product Column */}
                          <TableCell>
                            <div className="flex items-start gap-3">
                              {/* Product Image Placeholder */}
                              <div className="w-12 h-12 bg-surface-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {product.productId ? (
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
                                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                  </svg>
                                ) : null}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                {/* Product ID */}
                                {product.productId && (
                                  <div className="text-xs text-text-muted mb-0.5 truncate">
                                    {product.productId}
                                  </div>
                                )}
                                {/* SKU */}
                                <div className="text-xs text-text-muted mb-1 truncate">
                                  SKU: {product.sku}
                                </div>
                                {/* Product Name */}
                                <div className="font-medium text-text-primary text-sm mb-1.5 line-clamp-2 break-words">
                                  {product.productTitle || 'Unnamed Product'}
                                </div>
                                {/* Price, COGS, FBA Stock */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                  {/* Price */}
                                  <div>
                                    <span className="text-text-primary font-medium">
                                      {formatCurrency(unitPrice)}
                                    </span>
                                  </div>
                                  {/* COGS */}
                                  <div>
                                    <span className="text-text-muted">COGS </span>
                                    <span className="text-text-primary font-medium">
                                      {formatCurrency(cogsPerUnit)}
                                    </span>
                                  </div>
                                  {/* FBA Stock */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-text-primary font-medium">0</span>
                                    <span className="text-text-muted text-xs">FBA</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Tags */}
                          <TableCell>
                            <Badge variant="secondary" size="sm">
                              #FBA
                            </Badge>
                          </TableCell>

                          {/* COGS */}
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(product.totalCOGS || 0)}
                          </TableCell>

                          {/* Value of unsellable returns */}
                          <TableCell className="text-center whitespace-nowrap">
                            0%
                          </TableCell>

                          {/* Info Icon */}
                          <TableCell className="text-center">
                            <button className="text-text-muted hover:text-text-primary">
                              <svg
                                className="w-4 h-4 mx-auto"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </TableCell>

                          {/* Shipping Profile */}
                          <TableCell className="whitespace-nowrap">
                            <span className="text-sm">Default</span>
                          </TableCell>

                          {/* Profit per Unit */}
                          <TableCell className="text-right whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                profitPerUnit >= 0 ? 'text-success-600' : 'text-danger-600'
                              }`}
                            >
                              {formatCurrency(profitPerUnit)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-text-muted py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Toolbar - if items selected */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border shadow-lg px-6 py-3 z-50">
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedProducts(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}
