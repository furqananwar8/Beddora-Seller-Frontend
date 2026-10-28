'use client'

import React, { useMemo, useState } from 'react'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { useGetInventoryAgingQuery, type AgeFilter, type AgingMarketplace } from '@/services/api/inventoryAging.api'
import { cn } from '@/utils/cn'
import { InventoryAgingTable } from './InventoryAgingTable'
import { AGE_OPTIONS, defaultFilters, MARKETPLACE_OPTIONS } from './inventoryAgingFilters'

const PAGE_SIZE = 25

/**
 * Inventory Aging: Amazon's Inventory Age report (Manage Inventory Health, synced daily) for one marketplace, per
 * seller SKU, oldest stock first. Filters apply with the button.
 */
export const InventoryAgingScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters

  const { data, isLoading, isFetching, isError } = useGetInventoryAgingQuery({ marketplace: applied.marketplace, age: applied.age, search: applied.search.trim(), page, limit: PAGE_SIZE })

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Inventory Aging</h1>
        <p className="mt-1 text-sm text-text-muted">
          Units at Amazon by how long they have been in its warehouses, from Amazon&apos;s Inventory Age report
          {data?.snapshotDate ? ` of ${data.snapshotDate}` : ''}. Stock over 180 days old is shown in red.
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Amazon refreshes this report once a day</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="ia-search">
              <input
                id="ia-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Seller SKU, ASIN, FNSKU or product name"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Marketplace">
              <SegmentedToggle<AgingMarketplace>
                ariaLabel="Marketplace"
                value={draft.marketplace}
                onChange={(value) => setDraft('marketplace', value)}
                options={MARKETPLACE_OPTIONS}
                className={cn(FILL_TOGGLE, changed.has('marketplace') && 'ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem wide>
            <FormField label="Age">
              <SegmentedToggle<AgeFilter>
                ariaLabel="Age"
                value={draft.age}
                onChange={(value) => setDraft('age', value)}
                options={AGE_OPTIONS}
                className={cn(FILL_TOGGLE, changed.has('age') && 'ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <InventoryAgingTable report={data} isLoading={isLoading} isError={isError} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />
        )}
      </div>
    </Container>
  )
}
