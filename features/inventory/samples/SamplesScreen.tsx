'use client'

import React, { useMemo, useState } from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetSampleSuppliersQuery, useGetSamplesQuery, type SampleStatus, type SampleType } from '@/services/api/samples.api'
import { cn } from '@/utils/cn'
import { CreateSampleModal } from './CreateSampleModal'
import { SAMPLE_STATUS_OPTIONS, SAMPLE_TYPE_OPTIONS } from './sampleMeta'
import { SamplesTable } from './SamplesTable'

const PAGE_SIZE = 25

interface SampleFilters extends Record<string, unknown> {
  search: string
  supplierId: string
  type: SampleType | ''
  status: SampleStatus | ''
}

const defaultFilters = (): SampleFilters => ({ search: '', supplierId: '', type: '', status: '' })

/** One single-choice filter in the Inventory Planner's dropdown style; its first option (empty value) is "all". */
const FilterSelect: React.FC<{ label: string; title: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; pending: boolean }> = ({ label, title, value, onChange, options, pending }) => (
  <FormField label={label}>
    <MultiSelectInput single title={title} options={options} value={[value]} onChange={(next) => onChange(next[0] ?? '')} className={cn('rounded-lg', pending && 'ring-1 ring-primary-500')} />
  </FormField>
)

/** A filter box that shows it has a change waiting for Apply. */
const pending = (changed: Set<keyof SampleFilters>, key: keyof SampleFilters) => cn(changed.has(key) && 'border-primary-500 ring-1 ring-primary-500')

/**
 * Samples: every sample, made on a PO or here, free or chargeable, with where its payment stands. Search and filters
 * take effect when Apply filters is pressed.
 */
export const SamplesScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters
  const canWrite = useAppAbility().can('write', 'inventory:samples')
  const [creating, setCreating] = useState(false)

  const { data: suppliers = [] } = useGetSampleSuppliersQuery()
  const { data, isLoading, isFetching, isError } = useGetSamplesQuery({
    page,
    limit: PAGE_SIZE,
    ...(applied.search.trim() && { search: applied.search.trim() }),
    ...(applied.supplierId && { supplierId: Number(applied.supplierId) }),
    ...(applied.type && { type: applied.type }),
    ...(applied.status && { status: applied.status }),
  })

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Samples</h1>
          <p className="mt-1 text-sm text-text-muted">Samples suppliers send, made on a purchase order or here. They never change stock.</p>
        </div>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            + Create sample
          </Button>
        )}
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
            <FilterSelect
              label="Supplier"
              title="Supplier"
              value={draft.supplierId}
              onChange={(value) => setDraft('supplierId', value)}
              options={[{ id: '', name: 'All suppliers' }, ...suppliers.map((supplier) => ({ id: String(supplier.id), name: supplier.name }))]}
              pending={changed.has('supplierId')}
            />
          </FilterItem>
          <FilterItem>
            <FilterSelect label="Type" title="Type" value={draft.type} onChange={(value) => setDraft('type', value as SampleType | '')} options={SAMPLE_TYPE_OPTIONS.map(({ value, label }) => ({ id: value, name: label }))} pending={changed.has('type')} />
          </FilterItem>
          <FilterItem>
            <FilterSelect label="Payment" title="Payment" value={draft.status} onChange={(value) => setDraft('status', value as SampleStatus | '')} options={SAMPLE_STATUS_OPTIONS.map(({ value, label }) => ({ id: value, name: label }))} pending={changed.has('status')} />
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <SamplesTable rows={data?.data} isLoading={isLoading} isError={isError} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKU rows" />
        )}
      </div>
      <CreateSampleModal isOpen={creating} onClose={() => setCreating(false)} />
    </Container>
  )
}
