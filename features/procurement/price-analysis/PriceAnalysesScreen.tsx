'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetPriceAnalysesQuery, type CategoryRef, type PriceAnalysisListItem, type PriceAnalysisStatus } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { formatCalendarDay } from '@/utils/format'
import { CategorySelect } from '../shared/CategorySelect'
import { productLabel } from '../shared/ProductPicker'
import { NewAnalysisModal } from './NewAnalysisModal'
import { PRICE_ANALYSIS_LIST } from './PriceAnalysisScreen'

const PAGE_SIZE = 20
const CELL = 'text-center align-middle'
const COLUMNS = 8

type StatusFilter = 'ALL' | PriceAnalysisStatus

interface Filters extends Record<string, unknown> {
  status: StatusFilter
  category: CategoryRef | null
}

const DEFAULT_FILTERS: Filters = { status: 'ALL', category: null }

export const PA_STATUS_META: Record<PriceAnalysisStatus, { label: string; tone: StatusTone }> = {
  NONE: { label: 'No quotes', tone: 'neutral' },
  PENDING: { label: 'Awaiting approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
}

/** The list holds analyses; products without one are started from "New price analysis". */
const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: PA_STATUS_META.PENDING.label },
  { value: 'APPROVED', label: PA_STATUS_META.APPROVED.label },
]

export const priceAnalysisHref = (productId: number) => `${PRICE_ANALYSIS_LIST}/${productId}`

const muted = <span className="text-text-muted">—</span>

/** The price analyses: each product's quotes, lowest price and approval, filterable and paginated. */
export const PriceAnalysesScreen: React.FC = () => {
  const router = useRouter()
  const params = useSearchParams()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:price-analysis')

  // Old links (?productId=…) open that product's analysis
  const legacy = Number(params.get('productId'))
  useEffect(() => {
    if (Number.isInteger(legacy) && legacy > 0) router.replace(priceAnalysisHref(legacy))
  }, [legacy, router])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters
  const { data, isLoading, isFetching, isError } = useGetPriceAnalysesQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: applied.status,
    categoryId: applied.category?.id,
  })
  const rows = data?.data ?? []
  const [creating, setCreating] = useState(false)

  const actionsFor = (row: PriceAnalysisListItem) => [
    { key: 'open', label: canWrite ? 'Edit analysis' : 'View analysis', onSelect: () => router.push(priceAnalysisHref(row.product.id)) },
  ]

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Price analysis</h1>
          <p className="text-sm text-text-muted">{data ? `${data.totalRecords} ${data.totalRecords === 1 ? 'analysis' : 'analyses'} · ` : ''}supplier quotes ranked by price; one supplier approved per product</p>
        </div>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            + New price analysis
          </Button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="pa-search">
              <input
                id="pa-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Product, SKU, color or supplier"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem wide>
            <FormField label="Status">
              <SegmentedToggle<StatusFilter> ariaLabel="Status" value={draft.status} onChange={(value) => setDraft('status', value)} options={STATUS_OPTIONS} className={cn(FILL_TOGGLE, changed.has('status') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Category" htmlFor="pa-category">
              <CategorySelect id="pa-category" value={draft.category} onChange={(category) => setDraft('category', category)} allowAll highlighted={changed.has('category')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className="min-w-[220px] text-left">Product</TableHead>
                <TableHead className={CELL}>Category</TableHead>
                <TableHead className={CELL}>Suppliers</TableHead>
                <TableHead className={cn(CELL, 'min-w-[160px]')}>Lowest price</TableHead>
                <TableHead className={cn(CELL, 'min-w-[180px]')}>Approved supplier</TableHead>
                <TableHead className={CELL}>Status</TableHead>
                <TableHead className={cn(CELL, 'min-w-[140px]')}>Last updated</TableHead>
                <TableHead className={CELL}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS}>
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError || rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS}>
                    <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>
                      {isError ? 'Could not load price analyses.' : debouncedSearch || filters.appliedCount > 0 ? 'No price analysis matches.' : 'No price analyses yet. Start one with “New price analysis”.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.product.id} className="hover:bg-secondary-50">
                    <TableCell className="text-left align-middle">
                      <Link href={priceAnalysisHref(row.product.id)} className="font-mono text-xs font-semibold text-text-primary underline-offset-2 hover:underline">
                        {row.product.ref}
                      </Link>
                      <p className="text-sm text-text-secondary">{productLabel(row.product)}</p>
                      {(row.product.color || row.product.sizeName) && <p className="text-xs text-text-muted">{[row.product.color, row.product.sizeName].filter(Boolean).join(' · ')}</p>}
                    </TableCell>
                    <TableCell className={CELL}>{row.product.category?.name ?? muted}</TableCell>
                    <TableCell className={cn(CELL, 'tabular-nums')}>{row.supplierCount || muted}</TableCell>
                    <TableCell className={CELL}>
                      {row.lowest && row.currency ? (
                        <div className="flex flex-col items-center">
                          <span className="font-semibold tabular-nums">{formatCurrencyAmount(row.currency, row.lowest.unitPrice)}</span>
                          <span className="text-xs text-text-muted">{row.lowest.supplier}</span>
                        </div>
                      ) : (
                        muted
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      {row.approval && row.currency ? (
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-text-primary">{row.approval.supplier.name}</span>
                          <span className="text-xs text-text-muted">
                            {formatCurrencyAmount(row.currency, row.approval.unitPrice)} · {row.approval.by.name ?? 'approver'} · {formatCalendarDay(row.approval.at)}
                          </span>
                        </div>
                      ) : (
                        muted
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      <StatusBadge label={PA_STATUS_META[row.status].label} tone={PA_STATUS_META[row.status].tone} />
                    </TableCell>
                    <TableCell className={CELL}>
                      {row.updatedAt ? (
                        <div className="flex flex-col items-center whitespace-nowrap">
                          <span className="text-sm">{formatCalendarDay(row.updatedAt)}</span>
                          <span className="text-xs text-text-muted">{row.updatedBy?.name ?? ''}</span>
                        </div>
                      ) : (
                        muted
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      <RowActionsMenu label={row.product.ref} items={actionsFor(row)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="analyses" />}
      </div>

      <NewAnalysisModal isOpen={creating} onClose={() => setCreating(false)} hrefFor={priceAnalysisHref} />
    </Container>
  )
}
