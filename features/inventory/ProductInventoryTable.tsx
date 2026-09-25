"use client"

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Input } from '@/design-system/inputs'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { Badge } from '@/design-system/badges'
import { InventoryItemStatus, ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { InventoryBulkEdit } from './useInventoryBulkEdit'

export interface ProductInventoryTableProps {
  products?: ProductInventoryItem[]
  isLoading?: boolean
  isFetching?: boolean
  searchTerm?: string
  error?: any
  selectedProducts: string[]
  onProductSelect: (productId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  bulkEdit: InventoryBulkEdit
}

type SortColumn =
  | 'description'
  | 'totalQuantity'
  | 'amazonReserve'
  | 'otherMarketReserve'
  | 'status'
  | 'salesVelocity'
  | 'daysOfStockLeft'
  | 'daysUntilNextOrder'
  | 'recommendedQuantity'

interface ViewState {
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  currentPage: number
}

const INITIAL_VIEW: ViewState = { sortColumn: 'daysOfStockLeft', sortDirection: 'asc', currentPage: 1 }

const ITEMS_PER_PAGE = 20
const COLUMN_COUNT = 10
const NO_SALES_HINT = 'No sales in the last 30 days'

export const STATUS_OPTIONS: { value: InventoryItemStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
]

const STATUS_BADGE: Record<InventoryItemStatus, 'success' | 'secondary' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  DISCONTINUED: 'warning',
}

const HEAD_CLASS = 'sticky top-0 z-20 bg-surface py-3 px-4 border-b border-border align-middle text-center'
const CELL_CLASS = 'text-center align-middle'
// Edit fields share one shape so text inputs and the status dropdown line up
const FIELD_CLASS = 'h-10 py-2.5 rounded-lg text-sm text-center'
const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((o) => ({ id: o.value, name: o.label }))

const statusLabel = (status: InventoryItemStatus) =>
  STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status

// No sales means stock never runs out, so null sorts after every real value
const sortValue = (product: ProductInventoryItem, column: SortColumn): number | string => {
  const value = product[column]
  return value === null ? Number.POSITIVE_INFINITY : value
}

const DaysBadge = ({ days }: { days: number | null }) => {
  if (days === null) {
    return (
      <span className="text-text-muted" title={NO_SALES_HINT}>
        —
      </span>
    )
  }
  if (days <= 0) return <Badge variant="error">{days}</Badge>
  if (days < 7) return <Badge variant="warning">{days}</Badge>
  if (days < 30) return <Badge variant="success">{days}</Badge>
  return <Badge variant="primary">{days}</Badge>
}

export const ProductInventoryTable = ({
  products,
  isLoading,
  isFetching,
  searchTerm = '',
  error,
  selectedProducts,
  onProductSelect,
  onSelectAll,
  bulkEdit,
}: ProductInventoryTableProps) => {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW)
  const { edit, setDraftField, save } = bulkEdit

  useEffect(() => setView((prev) => ({ ...prev, currentPage: 1 })), [searchTerm])

  const handleSort = useCallback((column: SortColumn) => {
    setView((prev) => ({
      ...prev,
      sortColumn: column,
      sortDirection: prev.sortColumn === column && prev.sortDirection === 'desc' ? 'asc' : 'desc',
      currentPage: 1,
    }))
  }, [])

  const sortedProducts = useMemo(() => {
    const result = [...(products ?? [])]
    result.sort((a, b) => {
      const aVal = sortValue(a, view.sortColumn)
      const bVal = sortValue(b, view.sortColumn)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return view.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const diff = Number(aVal) - Number(bVal)
      if (Number.isNaN(diff)) return 0 // both Infinity
      return view.sortDirection === 'asc' ? diff : -diff
    })
    return result
  }, [products, view.sortColumn, view.sortDirection])

  const searchedProducts = useMemo(() => {
    if (!searchTerm) return sortedProducts
    const lower = searchTerm.toLowerCase()
    return sortedProducts.filter(
      (p) =>
        p.description.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower) ||
        p.sheetSku.toLowerCase().includes(lower)
    )
  }, [sortedProducts, searchTerm])

  // Edit mode shows every row being edited on one screen, whatever page or search it came from
  const visibleProducts = useMemo(() => {
    if (edit.isEditing) return sortedProducts.filter((p) => edit.drafts[p.id])
    const start = (view.currentPage - 1) * ITEMS_PER_PAGE
    return searchedProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [edit.isEditing, edit.drafts, sortedProducts, searchedProducts, view.currentPage])

  const totalPages = edit.isEditing ? 1 : Math.ceil(searchedProducts.length / ITEMS_PER_PAGE)
  const selectedCount = (products ?? []).filter((p) => selectedProducts.includes(p.id)).length
  const allSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedProducts.includes(p.id))
  const editCount = Object.keys(edit.drafts).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (edit.isEditing) save()
  }

  const showRefetchOverlay = Boolean(isFetching) && !isLoading && (products?.length ?? 0) > 0
  const bodyMessage = error
    ? { tone: 'error', text: `Couldn’t load inventory: ${error?.data?.error ?? error?.message ?? 'request failed'}` }
    : !products || products.length === 0
    ? { tone: 'muted', text: 'No inventory yet. Items appear here once the InBound_Logs sync picks up new stock.' }
    : visibleProducts.length === 0
    ? { tone: 'muted', text: 'No items match your search' }
    : null
  const isTableEmpty = Boolean(isLoading) || Boolean(bodyMessage)

  const SortableHead = ({ column, label, className }: { column: SortColumn; label: string; className?: string }) => (
    <TableHead
      className={cn(HEAD_CLASS, 'cursor-pointer hover:bg-surface-secondary', className)}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center justify-center gap-1 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
        <span>{label}</span>
        <span className={view.sortColumn === column ? '' : 'text-text-tertiary'}>
          {view.sortColumn !== column ? '↕' : view.sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      </div>
    </TableHead>
  )

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Lets Enter in any edit field save; the visible Save lives in the ⋮ menu */}
      {edit.isEditing && <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />}

      <p className="text-sm text-text-muted">
        {edit.isEditing
          ? `Editing ${editCount} item${editCount === 1 ? '' : 's'}. Save or cancel from the ⋮ menu, or press Enter to save.`
          : selectedCount > 0
          ? `${selectedCount} selected`
          : `${formatNumber(products?.length ?? 0, 0)} items`}
      </p>

      <div className="relative">
        {showRefetchOverlay && (
          <div className="absolute inset-0 bg-surface/65 backdrop-blur-[1px] z-30 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span className="text-xs font-medium text-text-muted">Updating inventory...</span>
            </div>
          </div>
        )}

        {/* Scroll container: body scrolls, header stays put */}
        <div className="w-full h-[500px] max-h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto overflow-x-auto border border-border rounded-lg shadow-sm flex flex-col">
          <Table className={cn('min-w-full border-separate border-spacing-0', isTableEmpty && 'h-full flex-1')}>
            <TableHeader className="sticky top-0 z-20 bg-surface shadow-sm">
              <TableRow className="bg-surface h-12">
                <TableHead className={cn(HEAD_CLASS, 'w-12')}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={edit.isEditing}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    aria-label="Select all items on this page"
                    className="rounded border-border-primary"
                  />
                </TableHead>
                <SortableHead column="description" label="Product" className="min-w-[320px]" />
                <SortableHead column="totalQuantity" label="Total quantity" className="min-w-[130px]" />
                <SortableHead column="amazonReserve" label="Amazon reserve" className="min-w-[130px]" />
                <SortableHead column="otherMarketReserve" label="Other market reserve" className="min-w-[160px]" />
                <SortableHead column="status" label="Status" className="min-w-[160px]" />
                <SortableHead column="salesVelocity" label="Sales velocity" className="min-w-[120px]" />
                <SortableHead column="daysOfStockLeft" label="Days of stock left" className="min-w-[140px]" />
                <SortableHead column="daysUntilNextOrder" label="Days until next order" className="min-w-[160px]" />
                <SortableHead column="recommendedQuantity" label="Recommended qty" className="min-w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="h-full">
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-2 py-12">
                      <Spinner />
                      <span className="text-sm text-text-muted">Loading inventory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : bodyMessage ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="h-full">
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center h-full min-h-[300px] py-12 text-center',
                        bodyMessage.tone === 'error' ? 'text-danger-600 font-medium' : 'text-text-muted'
                      )}
                    >
                      {bodyMessage.text}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleProducts.map((product) => {
                  const draft = edit.isEditing ? edit.drafts[product.id] : undefined
                  const rowErrors = edit.errors[product.id] ?? {}
                  return (
                    <TableRow key={product.id} className={draft ? 'bg-surface-secondary hover:bg-surface-secondary' : undefined}>
                      <TableCell className={CELL_CLASS}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          disabled={edit.isEditing}
                          onChange={(e) => onProductSelect(product.id, e.target.checked)}
                          aria-label={`Select ${product.sku}`}
                          className="rounded border-border-primary"
                        />
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        {draft ? (
                          <div className="flex flex-col gap-2 min-w-[300px]">
                            <Input
                              aria-label={`Description for ${product.sheetSku}`}
                              className={FIELD_CLASS}
                              value={draft.description}
                              onChange={(e) => setDraftField(product.id, 'description', e.target.value)}
                              error={rowErrors.description}
                            />
                            <Input
                              aria-label={`SKU for ${product.sheetSku}`}
                              className={FIELD_CLASS}
                              value={draft.sku}
                              onChange={(e) => setDraftField(product.id, 'sku', e.target.value)}
                              error={rowErrors.sku}
                              helperText={draft.sku.trim() !== product.sheetSku ? `Sheet SKU: ${product.sheetSku}` : undefined}
                            />
                          </div>
                        ) : (
                          <div className="mx-auto max-w-sm">
                            <div className="font-medium text-text-primary truncate" title={product.description}>
                              {product.description}
                            </div>
                            <div className="text-xs text-text-muted">
                              {product.sku}
                              {product.sheetSku !== product.sku && (
                                <span title="SKU as written in the InBound_Logs sheet"> · sheet: {product.sheetSku}</span>
                              )}
                              {product.lastReceivedDate && <> · received {product.lastReceivedDate}</>}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        <div className="font-medium">{formatNumber(product.totalQuantity, 0)}</div>
                        {product.unallocated > 0 && (
                          <div className="text-xs text-warning-700" title="Arrived but not yet split between FBA and FBM">
                            {formatNumber(product.unallocated, 0)} unallocated
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={CELL_CLASS}>{formatNumber(product.amazonReserve, 0)}</TableCell>
                      <TableCell className={CELL_CLASS}>{formatNumber(product.otherMarketReserve, 0)}</TableCell>
                      <TableCell className={CELL_CLASS}>
                        {draft ? (
                          <MultiSelectInput
                            single
                            title="Status"
                            className="w-full"
                            options={STATUS_SELECT_OPTIONS}
                            value={[draft.status]}
                            onChange={(value) => value[0] && setDraftField(product.id, 'status', value[0])}
                          />
                        ) : (
                          <Badge variant={STATUS_BADGE[product.status]}>{statusLabel(product.status)}</Badge>
                        )}
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        <span title={product.salesVelocity === 0 ? NO_SALES_HINT : 'Units per day, last 30 days'}>
                          {formatNumber(product.salesVelocity, 2)}
                        </span>
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        <DaysBadge days={product.daysOfStockLeft} />
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        <DaysBadge days={product.daysUntilNextOrder} />
                      </TableCell>
                      <TableCell className={CELL_CLASS}>
                        <span className="text-primary-600">{formatNumber(product.recommendedQuantity, 0)}</span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(view.currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(view.currentPage * ITEMS_PER_PAGE, searchedProducts.length)} of {searchedProducts.length} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView((prev) => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
              disabled={view.currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const { currentPage } = view
                let pageNum: number
                if (totalPages <= 5 || currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setView((prev) => ({ ...prev, currentPage: pageNum }))}
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
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView((prev) => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
              disabled={view.currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
