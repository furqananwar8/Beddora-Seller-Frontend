'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetAllProductsQuery } from '@/services/api/products.api'
import { useUpdateCOGSPerSkuMutation } from '@/services/api/cogs.api'
import { formatNumber } from '@/utils/format'
import { SplitTable, ColumnDef, PaginationConfig } from '@/components/split-table/SplitTable'

type SortColumn = 'product' | 'cogs' | 'salesVelocity'
type SortDirection = 'asc' | 'desc'
type CogsFilterValue = 'all' | 'set' | 'notSet'

interface EditedCOGS {
  [sku: string]: string
}

export const ProductsScreen: React.FC = () => {
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const dispatch = useAppDispatch()
  const { data: accountsData } = useGetAccountsQuery()

  /* ── filter / pagination state ── */
  const [search, setSearch] = useState({ raw: '', applied: '' })
  const [cogsFilter, setCogsFilter] = useState<{ raw: CogsFilterValue; applied: CogsFilterValue }>({
    raw: 'all',
    applied: 'all',
  })
  const [page, setPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('product')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  /* ── edit state ── */
  const [editedCOGS, setEditedCOGS] = useState<EditedCOGS>({})
  // NEW: SKUs currently being saved to the API (row-level skeletons + locks)
  const [pendingSkus, setPendingSkus] = useState<Set<string>>(new Set())
  // NEW: Successfully saved values that override stale RTK cache so we never need to refetch
  const [committedCOGS, setCommittedCOGS] = useState<Record<string, number>>({})

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id
  const limit = 10

  const {
    data: productsResponse,
    isLoading,   // TRUE = initial load only. This is the ONLY signal for the table skeleton.
    isFetching,  // TRUE = background refetch. We show a subtle badge, never the full skeleton.
  } = useGetAllProductsQuery(
    {
      accountId: effectiveAccountId!,
      page,
      limit,
      cogsSet: cogsFilter.applied,
      search: search.applied,
    },
    { skip: !effectiveAccountId }
  )

  const productsData = productsResponse?.data ?? []
  const totalRecords = productsResponse?.totalRecords ?? 0
  const totalPages = productsResponse?.totalPages ?? 0

  const [updateCOGS, { isLoading: isUpdatingCOGS }] = useUpdateCOGSPerSkuMutation()

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    dispatch(addNotification({ message, type }))
  }

  const handleSort = (sortKey: string) => {
    const column = sortKey as SortColumn
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const toggleProductSelection = (sku: string) => {
    const next = new Set(selectedProducts)
    if (next.has(sku)) next.delete(sku)
    else next.add(sku)
    setSelectedProducts(next)
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
    setCogsFilter((prev) => ({ ...prev, applied: prev.raw }))
    setSearch((prev) => ({ ...prev, applied: prev.raw.trim() }))
    setPage(1)
    setSelectedProducts(new Set())
    // Clear local overrides when filters change so we don't fight fresh server data
    setCommittedCOGS({})
  }

  const handleSave = async () => {
    const updates = Object.entries(editedCOGS)
      .filter(([_, v]) => v !== '' && !isNaN(parseFloat(v)))
      .map(([sku, v]) => ({ sku, cogs: parseFloat(v) }))

    if (updates.length === 0) return

    // Lock the affected rows. SplitTable will receive these as pendingRowKeys.
    setPendingSkus(new Set(updates.map((u) => u.sku)))

    try {
      await updateCOGS({ items: updates }).unwrap()

      // SUCCESS: persist locally, do NOT refetch.
      // The inputs keep the exact numbers the user typed.
      setCommittedCOGS((prev) => {
        const next = { ...prev }
        updates.forEach(({ sku, cogs }) => {
          next[sku] = cogs
        })
        return next
      })

      setEditedCOGS({})
      showToast(`COGS saved for ${updates.length} product${updates.length > 1 ? 's' : ''}`, 'success')
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update COGS'
      showToast(msg, 'error')
      console.error('Failed to update COGS:', err)
      // Intentionally keep editedCOGS on error so user can retry without retyping.
    } finally {
      setPendingSkus(new Set())
    }
  }

  const handleDiscard = () => {
    setEditedCOGS({})
    showToast('Changes discarded', 'success')
  }

  const hasEdits = Object.keys(editedCOGS).length > 0
  const isGlobalSaving = isUpdatingCOGS || pendingSkus.size > 0

  const sortedProducts = useMemo(() => {
    const result = [...productsData]
    result.sort((a: any, b: any) => {
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
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
    return result
  }, [productsData, sortColumn, sortDirection])

  const columns: ColumnDef[] = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={sortedProducts.length > 0 && selectedProducts.size === sortedProducts.length}
          onChange={toggleSelectAll}
          className="cursor-pointer"
        />
      ),
      width: 'w-12',
      align: 'center',
    },
    {
      key: 'product',
      header: 'Product',
      width: 'min-w-[320px] w-[45%]',
      align: 'center',
      sortable: true,
      sortKey: 'product',
    },
    {
      key: 'tags',
      header: 'Tags',
      width: 'w-24',
      align: 'center',
    },
    {
      key: 'cogs',
      header: 'COGS',
      width: 'w-32',
      align: 'center',
      sortable: true,
      sortKey: 'cogs',
    },
    {
      key: 'salesVelocity',
      header: 'Sales velocity',
      width: 'w-36',
      align: 'center',
      sortable: true,
      sortKey: 'salesVelocity',
    },
  ]

  /* ── renderCell now receives meta.isPending from the updated SplitTable ── */
  const renderCell = (
    product: any,
    col: ColumnDef,
    _rowIndex: number,
    meta?: { isPending: boolean }
  ) => {
    const isPending = meta?.isPending ?? false

    switch (col.key) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={selectedProducts.has(product.sku)}
            onChange={() => toggleProductSelection(product.sku)}
            disabled={isPending || isGlobalSaving}
            className="cursor-pointer disabled:opacity-40"
          />
        )

      case 'product': {
        const unitsSold = Math.round((product.salesVelocity || 0) * 30)
        return (
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
              {product.productId != null && (
                <div className="text-xs text-text-muted mb-0.5 truncate">
                  {product.productId}
                </div>
              )}
              <div className="text-xs text-text-muted mb-1 truncate">SKU: {product.sku}</div>
              <div className="font-medium text-text-primary text-sm mb-1 line-clamp-2 break-words">
                {product.productTitle || 'Unnamed Product'}
              </div>
              <div className="text-xs text-text-muted">
                Units sold: {formatNumber(unitsSold)} · FBA: 0
              </div>
            </div>
          </div>
        )
      }

      case 'tags':
        return (
          <Badge variant="secondary" size="sm">
            #FBA
          </Badge>
        )

      case 'cogs': {
        // Row-level skeleton: the value the user typed stays in memory,
        // but we show a pulse block so they know the row is working.
        if (isPending) {
          return (
            <div className="flex items-center justify-center gap-1">
              <span className="text-text-muted text-sm">C$</span>
              <div className="h-8 w-14 animate-pulse rounded bg-surface-secondary" />
            </div>
          )
        }

        const editedValue = editedCOGS[product.sku]
        const committedValue = committedCOGS[product.sku]

        // Display priority: active edit → locally committed → server cache
        let displayCOGS: string
        if (editedValue !== undefined) {
          displayCOGS = editedValue
        } else if (committedValue !== undefined) {
          displayCOGS = committedValue.toFixed(2)
        } else if (product.cogsPerUnit > 0) {
          displayCOGS = product.cogsPerUnit.toFixed(2)
        } else {
          displayCOGS = ''
        }

        return (
          <div className="flex items-center justify-center gap-1">
            <span className="text-text-muted text-sm">C$</span>
            <input
              type="text"
              inputMode="decimal"
              value={displayCOGS}
              onChange={(e) => handleCOGSChange(product.sku, e.target.value)}
              disabled={isGlobalSaving}
              className="w-14 text-center text-sm border border-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="—"
            />
          </div>
        )
      }

      case 'salesVelocity':
        return (
          <>
            <span className="text-text-primary font-medium">
              {formatNumber(product.salesVelocity || 0)}
            </span>
            <span className="text-text-muted text-xs ml-1">units/day</span>
          </>
        )

      default:
        return null
    }
  }

  const pagination: PaginationConfig = {
    page,
    pageSize: limit,
    totalItems: totalRecords,
    totalPages,
    onPageChange: setPage,
    itemLabel: 'products',
  }

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
                  value={search.raw}
                  onChange={(e) => setSearch((prev) => ({ ...prev, raw: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <div className="w-[30%] flex items-center justify-end gap-3">
              <select
                value={cogsFilter.raw}
                onChange={(e) =>
                  setCogsFilter((prev) => ({
                    ...prev,
                    raw: e.target.value as CogsFilterValue,
                  }))
                }
                className="h-9 w-40 px-3 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">Any COGS</option>
                <option value="set">COGS set</option>
                <option value="notSet">COGS not set</option>
              </select>

              <Button variant="primary" onClick={handleApplyFilters} isLoading={isFetching}>
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1 flex flex-col min-h-0 relative">
        {/* Subtle background-refetch badge — never replaces the table body */}
        {isFetching && !isLoading && (
          <div className="absolute top-2 right-4 z-30 flex items-center gap-2 text-xs text-text-muted bg-surface/90 px-2 py-1 rounded border border-border shadow-sm">
            <svg
              className="animate-spin h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Refreshing…
          </div>
        )}

        <CardContent className="p-0 flex flex-col h-full">
          <SplitTable
            columns={columns}
            data={sortedProducts}
            rowKey="sku"
            renderCell={renderCell}
            wrapperClassName="flex-1"
            /* STRICT: initial load ONLY. Never true for background refetch. */
            isLoading={isLoading}
            /* NEW: row-level locks. Pending rows get opacity-60 + skeleton cells. */
            pendingRowKeys={pendingSkus}
            skeletonRows={10}
            emptyMessage="No products found"
            pagination={pagination}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </CardContent>
      </Card>

      {/* Save Bar */}
        <div className="shrink-0 mt-4 bg-surface border border-border rounded-lg px-6 py-3">
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-text-muted">
              {Object.keys(editedCOGS).length} product
              {Object.keys(editedCOGS).length > 1 ? 's' : ''} modified
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
              disabled={isGlobalSaving}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isGlobalSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>
    </Container>
  )
}