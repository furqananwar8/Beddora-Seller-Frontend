'use client'

import React, { useMemo, useState } from 'react'
import DateRangePicker from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import { Container } from '@/components/layout'
import { useGetPartnerAgingQuery } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { currencyOptions } from '../shared/currency'
import { formatDay } from '../shared/format'
import { agingParams, defaultAgingFilters } from './agingFilters'
import { AgingEntriesModal, type AgingSelection } from './AgingEntriesModal'
import { AgingTable } from './AgingTable'

const CURRENCY_OPTIONS = currencyOptions()

/**
 * Open payments per partner by how close they are to their due date, and how far past it. Invoice dates and currencies
 * narrow it down; filters apply with the button.
 */
export const PartnerAgingScreen: React.FC = () => {
  const defaults = useMemo(defaultAgingFilters, [])
  const filters = useStagedFilters(defaults)
  const { draft, setDraft, applied, changed } = filters
  const { data, isLoading, isFetching, isError } = useGetPartnerAgingQuery(agingParams(applied))
  const [selection, setSelection] = useState<AgingSelection | null>(null)
  const { start: startExport, isExporting } = useReportExport('partner-aging')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Partner Aging Report</h1>
          <p className="mt-1 text-sm text-text-muted">
            Requests raised and not yet paid, by due date
            {data ? ` as of ${formatDay(data.asOf)}` : ''}. Click an amount to see the payments in it.
          </p>
        </div>
        {/* Built by the export worker; the file downloads by itself when the server announces it over SSE */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={!data?.rows.length || isExporting}
          onClick={() => void startExport('xlsx', { ...agingParams(applied) })}
        >
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </div>
      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Leave a filter empty to include everything</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Invoice date">
              <div className={cn(FILL_PICKER, changed.has('range') && 'ring-1 ring-primary-500')}>
                <DateRangePicker value={draft.range} onChange={(next) => setDraft('range', next)} placeholder="Any invoice date" />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Currency" htmlFor="aging-currency">
              <FilterMultiSelect
                id="aging-currency"
                options={CURRENCY_OPTIONS}
                value={draft.currencies}
                onChange={(value) => setDraft('currencies', value)}
                anyLabel="All currencies"
                highlighted={changed.has('currencies')}
              />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <AgingTable report={data} isLoading={isLoading} isError={isError} onOpen={setSelection} />
      </div>
      <AgingEntriesModal selection={selection} onClose={() => setSelection(null)} />
    </Container>
  )
}
