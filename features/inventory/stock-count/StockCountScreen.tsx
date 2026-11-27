'use client'

import React, { useMemo, useState } from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetStockCountsQuery, useSaveStockCountMutation, type StockCountRow } from '@/services/api/stockCount.api'
import { cn } from '@/utils/cn'
import { StockCountHistoryModal } from './StockCountHistoryModal'
import { StockCountModal } from './StockCountModal'
import { StockCountTable } from './StockCountTable'
import { defaultFilters, earliestAsOf, todayDay } from './stockCountFilters'
import type { CountFormValues } from './stockCountMath'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 25

/**
 * Stock Adjustment: every internal SKU's warehouse quantity on a day (today, or any day in the last 3 months), and a
 * physical count that corrects it. A correction for a past day is dated that day and carries forward, net of what
 * shipped or sold since. Filters apply with the button.
 */
export const StockCountScreen: React.FC = () => {
  const feedback = useApiFeedback()
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters

  const { data, isLoading, isFetching, isError } = useGetStockCountsQuery({ asOf: applied.asOf, search: applied.search.trim(), page, limit: pageSize })
  const [saveCount, { isLoading: saving }] = useSaveStockCountMutation()
  const [target, setTarget] = useState<StockCountRow | null>(null)
  const [historyOf, setHistoryOf] = useState<StockCountRow | null>(null)

  const save = async (row: StockCountRow, values: CountFormValues) => {
    try {
      const result = await saveCount({ id: row.id, asOf: row.asOf, counted: values.counted, expectedSystem: row.systemOnHand, note: values.note || undefined }).unwrap()
      feedback.success(result.changedBuckets.includes('FBM') ? `${row.sku} adjusted. FBM changed, so push stock from the Planner to refresh channel listings.` : `${row.sku} adjusted`)
      setTarget(null)
    } catch (error) {
      feedback.failure(error, 'Could not save the adjustment')
    }
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Stock Adjustment</h1>
        <p className="mt-1 text-sm text-text-muted">Correct a SKU&apos;s warehouse quantity after a physical count, for today or a past day. Orders since that day stay deducted.</p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick the day counted (today or up to 3 months back), then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="sc-search">
              <input
                id="sc-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="SKU, UPC, ASIN or product name"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Count date" htmlFor="sc-as-of">
              <div className={cn('rounded-lg', changed.has('asOf') && 'ring-1 ring-primary-500')}>
                <SingleDatePicker id="sc-as-of" value={draft.asOf} onChange={(value) => setDraft('asOf', value)} min={earliestAsOf()} max={todayDay()} />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <StockCountTable rows={data?.data} asOf={data?.data[0]?.asOf ?? applied.asOf} isLoading={isLoading} isError={isError} onAdjust={setTarget} onHistory={setHistoryOf} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />
        )}
      </div>

      <StockCountHistoryModal row={historyOf} onClose={() => setHistoryOf(null)} />
      <StockCountModal row={target} saving={saving} onSave={save} onClose={() => setTarget(null)} />
    </Container>
  )
}
