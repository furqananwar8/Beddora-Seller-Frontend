'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
import { useMinLoading } from '@/hooks/user-min-loading'

type SortColumn = 'product' | 'cogs' | 'salesVelocity'
type SortDirection = 'asc' | 'desc'
type CogsFilterValue = 'all' | 'set' | 'notSet'
type MarketplaceCode = 'CA' | 'US' | 'MX'

interface EditedCOGS {
  [key: string]: { cost: string; marketplace: MarketplaceCode; sku: string }
}

export const ProductsScreen: React.FC = () => {
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const dispatch = useAppDispatch()
  const { data: accountsData } = useGetAccountsQuery()

  /* ── Filter Draft & Applied States ── */
  const [search, setSearch] = useState({ raw: '', applied: '' })
  const [cogsFilter, setCogsFilter] = useState<{ raw: CogsFilterValue; applied: CogsFilterValue }>({
    raw: 'all',
    applied: 'all',
  })

  const [page, setPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('product')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  /* ── Edit State ── */
  const [editedCOGS, setEditedCOGS] = useState<EditedCOGS>({})
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [committedCOGS, setCommittedCOGS] = useState<Record<string, number>>({})

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id
  const limit = 10

  // Reset pagination to page 1 whenever applied filters change
  useEffect(() => {
    setPage(1)
  }, [search.applied, cogsFilter.applied])

  /* ── API Query ── */
  const {
    data: productsResponse,
    isLoading,
    isFetching,
  } = useGetAllProductsQuery(
    {
      accountId: effectiveAccountId!,
      page,
      limit,
      cogsSet: cogsFilter.applied,
      search: search.applied,
    },
    {
      skip: !effectiveAccountId,
    }
  )

  // Smooth out fast API responses to eliminate 10ms-50ms spinner flashes
  const visualFetching = useMinLoading(isFetching, 300)

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

  const toggleProductSelection = (itemKey: string) => {
    const next = new Set(selectedProducts)
    if (next.has(itemKey)) next.delete(itemKey)
    else next.add(itemKey)
    setSelectedProducts(next)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === sortedProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(sortedProducts.map((p: any) => `${p.sku}_${p.marketplace}`)))
    }
  }

  const handleCOGSChange = (sku: string, marketplace: MarketplaceCode, value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      const editKey = `${sku}_${marketplace}`
      setEditedCOGS((prev) => ({
        ...prev,
        [editKey]: { cost: value, marketplace, sku },
      }))
    }
  }

  /* ── Apply Filters Button / Enter Key Handler ── */
  const handleApplyFilters = () => {
    setCogsFilter((prev) => ({ ...prev, applied: prev.raw }))
    setSearch((prev) => ({ ...prev, applied: prev.raw.trim() }))
    setPage(1)
    setSelectedProducts(new Set())
    setCommittedCOGS({})
  }

  const handleSave = async () => {
    const updates = Object.entries(editedCOGS)
      .filter(([_, v]) => v.cost !== '' && !isNaN(parseFloat(v.cost)))
      .map(([_, v]) => ({
        sku: v.sku,
        cost: parseFloat(v.cost),
        marketplace: v.marketplace,
      }))

    if (updates.length === 0) return

    const pendingSet = new Set(updates.map((u) => `${u.sku}_${u.marketplace}`))
    setPendingKeys(pendingSet)

    try {
      await updateCOGS({ items: updates }).unwrap()

      setCommittedCOGS((prev) => {
        const next = { ...prev }
        updates.forEach(({ sku, marketplace, cost }) => {
          next[`${sku}_${marketplace}`] = cost
        })
        return next
      })

      setEditedCOGS({})
      showToast(`COGS saved for ${updates.length} product${updates.length > 1 ? 's' : ''}`, 'success')
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update COGS'
      showToast(msg, 'error')
      console.error('Failed to update COGS:', err)
    } finally {
      setPendingKeys(new Set())
    }
  }

  const handleDiscard = () => {
    setEditedCOGS({})
    showToast('Changes discarded', 'success')
  }

  const isGlobalSaving = isUpdatingCOGS || pendingKeys.size > 0

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
      align: 'left',
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
      width: 'w-36',
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

  const renderCell = (
    product: any,
    col: ColumnDef,
    _rowIndex: number,
    meta?: { isPending: boolean }
  ) => {
    const marketplace: MarketplaceCode = product.marketplace || 'US'
    const compoundKey = `${product.sku}_${marketplace}`
    const isPending = meta?.isPending || pendingKeys.has(compoundKey)

    const currencySymbol = marketplace === 'CA' ? 'C$' : marketplace === 'MX' ? 'MX$' : '$'

    switch (col.key) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={selectedProducts.has(compoundKey)}
            onChange={() => toggleProductSelection(compoundKey)}
            disabled={isPending || isGlobalSaving}
            className="cursor-pointer disabled:opacity-40"
          />
        )

      case 'product': {
        const unitsSold = Math.round((product.salesVelocity || 0) * 30)
        return (
          <div className="flex items-start justify-start gap-3 text-left">
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
            <div className="flex-1 min-w-0">
              {product.productId != null && (
                <div className="text-xs text-text-muted mb-0.5 truncate">
                  ID: {product.productId}
                </div>
              )}
              <div className="text-xs text-text-muted mb-1 truncate">
                SKU: {product.sku} <span className="font-semibold text-text-primary">({marketplace})</span>
              </div>
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

      case 'tags': {
        const channel = (
          product.fulfillmentChannel ||
          product.fulfillmentChannelCode ||
          ''
        ).toUpperCase()

        const isFBA =
          channel.includes('AMAZON') ||
          channel.includes('AFN') ||
          channel.includes('FBA') ||
          channel === 'DEFAULT'

        const tagLabel = isFBA ? '#FBA' : '#FBM'

        return (
          <Badge
            variant="secondary"
            size="sm"
            className="bg-white text-black border border-border font-medium"
          >
            {tagLabel}
          </Badge>
        )
      }

      case 'cogs': {
        if (isPending) {
          return (
            <div className="flex items-center justify-center gap-1">
              <span className="text-text-muted text-sm">{currencySymbol}</span>
              <div className="h-8 w-14 animate-pulse rounded bg-surface-secondary" />
            </div>
          )
        }

        const isSystemLocked = Boolean(product.isLocked && product.lockedBy === 'SYSTEM')
        const edited = editedCOGS[compoundKey]
        const committed = committedCOGS[compoundKey]

        let displayCOGS: string
        if (edited !== undefined) {
          displayCOGS = edited.cost
        } else if (committed !== undefined) {
          displayCOGS = committed.toFixed(2)
        } else if (product.cogsPerUnit > 0) {
          displayCOGS = Number(product.cogsPerUnit).toFixed(2)
        } else {
          displayCOGS = ''
        }

        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-text-muted text-sm">{currencySymbol}</span>
            <input
              type="text"
              inputMode="decimal"
              value={displayCOGS}
              onChange={(e) => handleCOGSChange(product.sku, marketplace, e.target.value)}
              disabled={isSystemLocked || isGlobalSaving}
              className={`w-16 text-center text-sm border rounded px-1 py-1 focus:outline-none focus:ring-1 bg-surface ${
                isSystemLocked
                  ? 'border-border-muted text-text-muted cursor-not-allowed bg-surface-secondary opacity-60'
                  : 'border-border focus:ring-primary focus:border-primary disabled:opacity-50'
              }`}
              placeholder="—"
            />
            {isSystemLocked && (
              <span title="Locked by System (Google Sheets)" className="text-text-muted text-xs cursor-help">
                🔒
              </span>
            )}
          </div>
        )
      }

      case 'salesVelocity':
        return (
          <div className="text-center">
            <span className="text-text-primary font-medium">
              {formatNumber(product.salesVelocity || 0)}
            </span>
            <span className="text-text-muted text-xs ml-1">units/day</span>
          </div>
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
          <div className="flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
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
                {search.raw && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch({ raw: '', applied: '' })
                      setPage(1)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls with Fixed Width Button */}
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={cogsFilter.raw}
                onChange={(e) =>
                  setCogsFilter((prev) => ({
                    ...prev,
                    raw: e.target.value as CogsFilterValue,
                  }))
                }
                className="h-9 w-40 px-3 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer shrink-0"
              >
                <option value="all">Any COGS</option>
                <option value="set">COGS set</option>
                <option value="notSet">COGS not set</option>
              </select>

              <Button
                variant="primary"
                onClick={handleApplyFilters}
                isLoading={visualFetching}
                className="w-24 shrink-0 flex items-center justify-center"
              >
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className="flex-1 flex flex-col min-h-0 relative">
        <CardContent className="p-0 flex flex-col h-full">
          <SplitTable
            columns={columns}
            data={sortedProducts}
            rowKey={(row: any) => `${row.sku}_${row.marketplace}`}
            renderCell={renderCell}
            wrapperClassName="flex-1"
            isLoading={isLoading}
            isFetching={visualFetching}
            pendingRowKeys={pendingKeys}
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