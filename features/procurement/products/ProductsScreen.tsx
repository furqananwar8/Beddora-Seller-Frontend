'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useArchivePoProductMutation,
  useGetPoProductsQuery,
  useGetPoProductSummaryQuery,
  type CategoryRef,
  type PoProduct,
  type ProductTag,
} from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { CategorySelect } from '../shared/CategorySelect'
import { CategoriesModal } from './CategoriesModal'
import { ProductsTable } from './ProductsTable'

const BASE = '/dashboard/procurement/products'
const PAGE_SIZE = 20

type TagFilter = 'ALL' | ProductTag

const TAG_OPTIONS: Array<{ value: TagFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'VARIATION', label: 'Variation' },
]

interface Filters extends Record<string, unknown> {
  category: CategoryRef | null
  color: string | null
  tag: TagFilter
}

const DEFAULT_FILTERS: Filters = { category: null, color: null, tag: 'ALL' }

const ALL_COLORS = 'All colors'

export const ProductsScreen: React.FC = () => {
  const router = useRouter()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:products')
  const { success, failure } = useApiFeedback()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied } = filters

  const { data, isLoading, isFetching, isError } = useGetPoProductsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    categoryId: applied.category?.id,
    color: applied.color ?? undefined,
    tag: applied.tag,
  })
  const { data: summary } = useGetPoProductSummaryQuery()

  const [managingCategories, setManagingCategories] = useState(false)
  const [archiving, setArchiving] = useState<PoProduct | null>(null)
  const [archive, { isLoading: archivingBusy }] = useArchivePoProductMutation()

  const confirmArchive = async () => {
    if (!archiving) return
    try {
      await archive(archiving.id).unwrap()
      success(`${archiving.ref} archived`)
      setArchiving(null)
    } catch (error) {
      failure(error, 'Could not archive the product')
    }
  }

  const filtered = Boolean(debouncedSearch) || filters.appliedCount > 0
  const colors = [ALL_COLORS, ...(summary?.colors ?? [])]

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Products</h1>
          {summary && (
            <p className="text-sm text-text-muted">
              {summary.masters} master {summary.masters === 1 ? 'product' : 'products'} · {summary.variations} {summary.variations === 1 ? 'variation' : 'variations'}
            </p>
          )}
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setManagingCategories(true)}>
              Categories
            </Button>
            <Link href={`${BASE}/new`} className="ds-button ds-button-primary ds-button-sm">
              + New product
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={filters.changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="products-search">
              <input
                id="products-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Name, variant name or SKU"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Category" htmlFor="products-category">
              <CategorySelect
                id="products-category"
                allowAll
                value={filters.draft.category}
                onChange={(category) => filters.setDraft('category', category)}
                highlighted={filters.changed.has('category')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Color" htmlFor="products-color">
              <SearchableSelect<string>
                id="products-color"
                value={filters.draft.color ?? ALL_COLORS}
                onChange={(color) => filters.setDraft('color', color === ALL_COLORS ? null : color)}
                options={colors}
                getKey={(color) => color}
                getLabel={(color) => color}
                searchPlaceholder="Search colors..."
                highlighted={filters.changed.has('color')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Tag">
              <SegmentedToggle<TagFilter>
                ariaLabel="Tag"
                value={filters.draft.tag}
                onChange={(tag) => filters.setDraft('tag', tag)}
                options={TAG_OPTIONS}
                className={cn(FILL_TOGGLE, filters.changed.has('tag') && 'ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-380px)] overflow-auto">
          <ProductsTable
            rows={data?.data ?? []}
            isLoading={isLoading}
            isError={isError}
            filtered={filtered}
            canWrite={canWrite}
            onEdit={(row) => router.push(`${BASE}/${row.parentId ?? row.id}`)}
            onAddVariation={(row) => router.push(`${BASE}/${row.id}?addVariation=1`)}
            onDuplicate={(row) => router.push(`${BASE}/new?from=${row.id}`)}
            onArchive={setArchiving}
          />
        </div>
        {data && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="masters" />
        )}
      </div>

      {canWrite && <CategoriesModal isOpen={managingCategories} onClose={() => setManagingCategories(false)} />}

      <ConfirmDialog
        isOpen={archiving !== null}
        title={archiving?.tag === 'VARIATION' ? 'Archive variation' : 'Archive product'}
        confirmLabel="Archive"
        tone="danger"
        busy={archivingBusy}
        onConfirm={confirmArchive}
        onClose={() => setArchiving(null)}
      >
        {archiving?.tag === 'VARIATION' ? (
          <p>
            <strong>{archiving.variantName ?? archiving.ref}</strong> will leave the product list and every product picker. Its SKU stays reserved.
          </p>
        ) : (
          <p>
            <strong>{archiving?.name}</strong> and all of its variations will leave the product list and every product picker. Their SKUs stay reserved.
          </p>
        )}
      </ConfirmDialog>
    </Container>
  )
}
