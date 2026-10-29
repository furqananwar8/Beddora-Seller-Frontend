'use client'

import React, { useMemo, useState } from 'react'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import { useGetWarehouseInventoryQuery, type StockFilter } from '@/services/api/warehouseInventory.api'
import { cn } from '@/utils/cn'
import { WarehouseInventoryTable } from './WarehouseInventoryTable'
import { defaultFilters, earliestAsOf, STOCK_OPTIONS, todayDay } from './warehouseInventoryFilters'

const PAGE_SIZE = 25

/**
 * Warehouse Inventory: per internal SKU, the units at Amazon Canada and USA, in our warehouses, returned and damaged,
 * in containers on their way, and the whole pipeline at its COGS landed cost. Filters apply with the button.
 */
export const WarehouseInventoryScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters

  const query = { asOf: applied.asOf, stock: applied.stock, search: applied.search.trim() }
  const { data, isLoading, isFetching, isError } = useGetWarehouseInventoryQuery({ ...query, page, limit: PAGE_SIZE })
  // Built by the export worker; the file downloads by itself when the server announces it over SSE
  const { start: startExport, isExporting } = useReportExport('warehouse-inventory')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Warehouse Inventory</h1>
          <p className="mt-1 text-sm text-text-muted">Stock per SKU at Amazon, in our warehouses and in containers on their way, with the pipeline at its landed cost.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-10" disabled={!data?.totalRecords || isExporting} onClick={() => void startExport('xlsx', query)}>
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Count stock on a day within the last 3 months, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="wi-search">
              <input
                id="wi-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="SKU, channel SKU, UPC or product name"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="As of" htmlFor="wi-as-of">
              <div className={cn('rounded-lg', changed.has('asOf') && 'ring-1 ring-primary-500')}>
                <SingleDatePicker id="wi-as-of" value={draft.asOf} onChange={(value) => setDraft('asOf', value)} min={earliestAsOf()} max={todayDay()} />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem wide>
            <FormField label="Stock">
              <SegmentedToggle<StockFilter> ariaLabel="Stock" value={draft.stock} onChange={(value) => setDraft('stock', value)} options={STOCK_OPTIONS} className={cn(FILL_TOGGLE, changed.has('stock') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <WarehouseInventoryTable report={data} isLoading={isLoading} isError={isError} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />
        )}
      </div>
    </Container>
  )
}
