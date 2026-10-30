'use client'

import React, { useMemo, useState } from 'react'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { useGetChannelInvpQuery, type InvpChannelFilter } from '@/services/api/channelInvp.api'
import { cn } from '@/utils/cn'
import { InvpTable } from './InvpTable'
import { CHANNEL_OPTIONS, defaultFilters, MARKETPLACE_OPTIONS } from './invpFilters'

const PAGE_SIZE = 20


/**
 * Channel INVP: per internal SKU, the live stock in our warehouse, at the channels and on shipments to FBA / WFS,
 * its sales rates, and the stock projected from today week by week, coloured by how long it lasts. Filters apply
 * with the button.
 */
export const ChannelInvpScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters
  const query = {
    channel: applied.channel,
    marketplaces: applied.marketplaces,
    search: applied.search.trim(),
    page,
    limit: PAGE_SIZE,
  }
  const { data, isLoading, isFetching, isError } = useGetChannelInvpQuery(query)
  // Built by the export worker; the file downloads by itself when the server announces it over SSE
  const { start: startExport, isExporting } = useReportExport('channel-invp')
  const { page: _page, limit: _limit, ...exportFilters } = query

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Channel INVP</h1>
          <p className="mt-1 text-sm text-text-muted">Live stock per SKU and its projection from today, week by week{data ? ` (as of ${data.asOf})` : ''}, against a 30-day clearance target.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!data?.totalRecords || isExporting} onClick={() => void startExport('xlsx', exportFilters)}>
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick filters, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Channel">
              <SegmentedToggle<InvpChannelFilter> ariaLabel="Channel" value={draft.channel} onChange={(value) => setDraft('channel', value)} options={CHANNEL_OPTIONS} className={cn(FILL_TOGGLE, changed.has('channel') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
          <FilterItem wide>
            <FormField label="Search" htmlFor="invp-search">
              <input
                id="invp-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Internal or channel SKU, or product name"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Marketplace" htmlFor="invp-marketplace">
              <FilterMultiSelect id="invp-marketplace" options={MARKETPLACE_OPTIONS} value={draft.marketplaces} onChange={(value) => setDraft('marketplaces', value)} anyLabel="All marketplaces" highlighted={changed.has('marketplaces')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <InvpTable report={data} isLoading={isLoading} isError={isError} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />
        )}
      </div>
    </Container>
  )
}
