'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice' // ← adjust path to your slice
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetProfitByProductQuery } from '@/services/api/profit.api'
import { useUpdateCOGSPerSkuMutation } from '@/services/api/cogs.api'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { formatNumber } from '@/utils/format'
import { TableSkeleton } from '@/design-system/loaders'

type SortColumn = 'product' | 'cogs' | 'salesVelocity'
type SortDirection = 'asc' | 'desc'

interface EditedCOGS {
  [sku: string]: string
}

export const ProductsScreen: React.FC = () => {
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const dispatch = useAppDispatch()
  const { data: accountsData } = useGetAccountsQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [pendingCogsSet, setPendingCogsSet] = useState<'all' | 'set' | 'notSet'>('all')
  const [appliedCogsSet, setAppliedCogsSet] = useState<'all' | 'set' | 'notSet'>('all')
  const [page, setPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('product')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editedCOGS, setEditedCOGS] = useState<EditedCOGS>({})

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id
  const limit = 10

  const { data: productsResponse, isLoading, isFetching } = useGetProfitByProductQuery(
    {
      accountId: effectiveAccountId,
      page,
      limit,
      cogsSet: appliedCogsSet,
      search: appliedSearch,
    },
    { skip: !effectiveAccountId }
  )

  const isBusy = isLoading || isFetching

  const productsData = productsResponse?.data ?? []
  const totalRecords = productsResponse?.totalRecords ?? 0
  const totalPages = productsResponse?.totalPages ?? 0

  const [updateCOGS, { isLoading: isUpdatingCOGS }] = useUpdateCOGSPerSkuMutation()

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    dispatch(addNotification({ message, type }))
  }

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
    if (selectedProducts.size === sortedProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(sortedProducts.map((p) => p.sku)))
    }
  }

  const handleCOGSChange = (sku: string, value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setEditedCOGS((prev) => ({ ...prev, [sku]: value }))
    }
  }

  const handleApplyFilters = () => {
    setAppliedCogsSet(pendingCogsSet)
    setAppliedSearch(searchTerm.trim())
    setPage(1)
    setSelectedProducts(new Set())
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleSave = async () => {
    const updates = Object.entries(editedCOGS)
      .filter(([_, value]) => value !== '' && !isNaN(parseFloat(value)))
      .map(([sku, value]) => ({ sku, cogs: parseFloat(value) }))

    if (updates.length === 0) return

    try {
      await updateCOGS({ items: [...updates] }).unwrap()
      showToast(
        `COGS saved for ${updates.length} product${updates.length > 1 ? 's' : ''}`,
        'success'
      )
      setEditedCOGS({})
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Failed to update COGS'
      showToast(message, 'error')
      console.error('Failed to update COGS:', err)
    }
  }

  const handleDiscard = () => {
    setEditedCOGS({})
    showToast('Changes discarded', 'info')
  }

  const hasEdits = Object.keys(editedCOGS).length > 0

  const sortedProducts = useMemo(() => {
    const result = [...productsData]

    result.sort((a, b) => {
      let aVal: any = 0
      let bVal: any = 0

      switch (sortColumn) {
        case 'product':
          aVal = a.productTitle || a.sku || ''
          bVal = b.productTitle || b.sku || ''
          break
        case 'cogs':
          aVal = a.cogsPerUnit || 0
          bVal = b.cogsPerUnit || 0
          break
        case 'salesVelocity':
          aVal = a.salesVelocity || 0
          bVal = b.salesVelocity || 0
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
  }, [productsData, sortColumn, sortDirection])

  return (
    <Container size="full" className="h-[calc(100vh-100px)] flex flex-col">
      {/* Page Header */}
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Products</h1>
      </div>

      {/* Top Toolbar */}
      <div className="shrink-0 bg-surface border-b border-border mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-[70%]">
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
                  placeholder="Search by SKU, title, or ASIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyFilters()
                  }}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <div className="w-[30%] flex items-center justify-end gap-3">
              <select
                value={pendingCogsSet}
                onChange={(e) => setPendingCogsSet(e.target.value as 'all' | 'set' | 'notSet')}
                className="h-9 w-40 px-3 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">Any COGS</option>
                <option value="set">COGS set</option>
                <option value="notSet">COGS not set</option>
              </select>

              <Button
                variant="primary"
                onClick={handleApplyFilters}
                isLoading={isFetching}
              >
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col h-full">
          {isBusy ? (
            <div className="p-6">
              <TableSkeleton rows={10} columns={5} />
            </div>
          ) : (
            <>
              <div className="overflow-auto flex-1 min-h-0">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="sticky top-0 z-20 bg-surface shadow-sm">
                      <TableHead className="w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            sortedProducts.length > 0 &&
                            selectedProducts.size === sortedProducts.length
                          }
                          onChange={toggleSelectAll}
                          className="cursor-pointer"
                        />
                      </TableHead>
                      <TableHead
                        className="min-w-[320px] w-[45%] cursor-pointer hover:bg-surface-secondary text-center"
                        onClick={() => handleSort('product')}
                      >
                        Product {sortColumn === 'product' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="w-24 text-center">Tags</TableHead>
                      <TableHead
                        className="w-32 cursor-pointer hover:bg-surface-secondary text-center"
                        onClick={() => handleSort('cogs')}
                      >
                        COGS {sortColumn === 'cogs' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead
                        className="w-36 cursor-pointer hover:bg-surface-secondary text-center"
                        onClick={() => handleSort('salesVelocity')}
                      >
                        Sales velocity {sortColumn === 'salesVelocity' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.length > 0 ? (
                      sortedProducts.map((product) => {
                        const editedValue = editedCOGS[product.sku]
                        const displayCOGS =
                          editedValue !== undefined
                            ? editedValue
                            : product.cogsPerUnit > 0
                            ? product.cogsPerUnit.toFixed(2)
                            : ''

                        return (
                          <TableRow key={product.sku} className="hover:bg-surface-secondary">
                            <TableCell className="w-12 text-center">
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product.sku)}
                                onChange={() => toggleProductSelection(product.sku)}
                                className="cursor-pointer"
                              />
                            </TableCell>

                            <TableCell className="min-w-[320px] w-[45%] text-center">
                              <div className="flex items-start justify-center gap-3">
                                <div className="w-12 h-12 bg-surface-secondary flex items-center justify-center flex-shrink-0 overflow-hidden rounded">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.productTitle || product.sku}
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
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  {product.productId && (
                                    <div className="text-xs text-text-muted mb-0.5 truncate">
                                      {product.productId}
                                    </div>
                                  )}
                                  <div className="text-xs text-text-muted mb-1 truncate">
                                    SKU: {product.sku}
                                  </div>
                                  <div className="font-medium text-text-primary text-sm mb-1 line-clamp-2 break-words">
                                    {product.productTitle || 'Unnamed Product'}
                                  </div>
                                  <div className="text-xs text-text-muted">
                                    Units sold: {formatNumber(product.unitsSold)} · FBA: 0
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="w-24 text-center">
                              <Badge variant="secondary" size="sm">
                                #FBA
                              </Badge>
                            </TableCell>

                            <TableCell className="w-32 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-text-muted text-sm">C$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={displayCOGS}
                                  onChange={(e) => handleCOGSChange(product.sku, e.target.value)}
                                  className="w-14 text-center text-sm border border-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-surface"
                                  placeholder="—"
                                />
                              </div>
                            </TableCell>

                            <TableCell className="w-36 text-center whitespace-nowrap">
                              <span className="text-text-primary font-medium">
                                {formatNumber(product.salesVelocity)}
                              </span>
                              <span className="text-text-muted text-xs ml-1">units/day</span>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-text-muted py-8">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalRecords > 0 && (
                <div className="shrink-0 border-t border-border">
                  <PaginationFooter
                    page={page}
                    pageSize={limit}
                    totalItems={totalRecords}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemLabel="products"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Bar */}
        <div className="shrink-0 mt-4 bg-surface border border-border rounded-lg px-6 py-3">
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-text-muted">
              {Object.keys(editedCOGS).length} product{Object.keys(editedCOGS).length > 1 ? 's' : ''} modified
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isUpdatingCOGS}
            >
              Save Changes
            </Button>
          </div>
        </div>
    </Container>
  )
}