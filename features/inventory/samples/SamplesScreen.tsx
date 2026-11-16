'use client'

import React, { useMemo, useState } from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Select } from '@/design-system/inputs'
import { useGetSampleSuppliersQuery, useGetSamplesQuery, type SampleStatus, type SampleType } from '@/services/api/samples.api'
import { cn } from '@/utils/cn'
import { SAMPLE_STATUS_OPTIONS, SAMPLE_TYPE_OPTIONS } from './sampleMeta'
import { SamplesTable } from './SamplesTable'

const PAGE_SIZE = 25

interface SampleFilters extends Record<string, unknown> {
  search: string
  supplierId: string
  type: SampleType | ''
  status: SampleStatus | ''
  inventoryFrom: string
  inventoryTo: string
}

const defaultFilters = (): SampleFilters => ({ search: '', supplierId: '', type: '', status: '', inventoryFrom: '', inventoryTo: '' })

/** A filter box that shows it has a change waiting for Apply. */
const pending = (changed: Set<keyof SampleFilters>, key: keyof SampleFilters) => cn(changed.has(key) && 'border-primary-500 ring-1 ring-primary-500')

/**
 * Samples: every sample suppliers send with POs, free or chargeable, with where its payment stands and when it was added
 * to the SKU's Samples section. Search and filters take effect when Apply filters is pressed.
 */
export const SamplesScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters

  const { data: suppliers = [] } = useGetSampleSuppliersQuery()
  const { data, isLoading, isFetching, isError } = useGetSamplesQuery({
    page,
    limit: PAGE_SIZE,
    ...(applied.search.trim() && { search: applied.search.trim() }),
    ...(applied.supplierId && { supplierId: Number(applied.supplierId) }),
    ...(applied.type && { type: applied.type }),
    ...(applied.status && { status: applied.status }),
    ...(applied.inventoryFrom && { inventoryFrom: applied.inventoryFrom }),
    ...(applied.inventoryTo && { inventoryTo: applied.inventoryTo }),
  })

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Samples</h1>
        <p className="mt-1 text-sm text-text-muted">Samples suppliers send with purchase orders. They are counted per SKU for information and never change stock.</p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Filters</h2>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="samples-search">
              <input
                id="samples-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="SKU, product, PO number or supplier"
                className={cn('ds-input ds-input-default rounded-lg', pending(changed, 'search'))}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <Select
              label="Supplier"
              value={draft.supplierId}
              onChange={(event) => setDraft('supplierId', event.target.value)}
              className={pending(changed, 'supplierId')}
              options={[{ value: '', label: 'All suppliers' }, ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name }))]}
            />
          </FilterItem>
          <FilterItem>
            <Select label="Type" value={draft.type} onChange={(event) => setDraft('type', event.target.value as SampleType | '')} className={pending(changed, 'type')} options={SAMPLE_TYPE_OPTIONS} />
          </FilterItem>
          <FilterItem>
            <Select label="Payment" value={draft.status} onChange={(event) => setDraft('status', event.target.value as SampleStatus | '')} className={pending(changed, 'status')} options={SAMPLE_STATUS_OPTIONS} />
          </FilterItem>
          <FilterItem>
            <FormField label="Added from" htmlFor="samples-from">
              <div className={cn('rounded-lg', changed.has('inventoryFrom') && 'ring-1 ring-primary-500')}>
                <SingleDatePicker id="samples-from" value={draft.inventoryFrom} onChange={(value) => setDraft('inventoryFrom', value)} placeholder="Any date" />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Added to" htmlFor="samples-to">
              <div className={cn('rounded-lg', changed.has('inventoryTo') && 'ring-1 ring-primary-500')}>
                <SingleDatePicker id="samples-to" value={draft.inventoryTo} onChange={(value) => setDraft('inventoryTo', value)} placeholder="Any date" />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <SamplesTable rows={data?.data} isLoading={isLoading} isError={isError} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="samples" />
        )}
      </div>
    </Container>
  )
}
