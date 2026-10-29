'use client'

import React, { useMemo, useState } from 'react'
import DateRangePicker from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { useGetChannelInvpQuery, type InvpChannel, type InvpGrouping, type InvpView } from '@/services/api/channelInvp.api'
import { cn } from '@/utils/cn'
import { InvpBreakdownModal, type InvpSelection } from './InvpBreakdownModal'
import { InvpTable, type InvpTarget } from './InvpTable'
import { CHANNEL_LABEL, CHANNEL_OPTIONS, defaultFilters, earliestDay, GROUPING_OPTIONS, INVP_PRESETS, lineLabel, MARKETPLACE_OPTIONS, VIEW_OPTIONS, withinLookback } from './invpFilters'

const PAGE_SIZE = 20


/**
 * Channel INVP: per internal SKU and marketplace, the stock in our warehouse, in containers and at the channel over
 * the last three months, with daily sales, coloured by how long the stock lasts. Filters apply with the button;
 * a label or figure opens what it is made of.
 */
export const ChannelInvpScreen: React.FC = () => {
  const defaults = useMemo(defaultFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters
  const [selection, setSelection] = useState<InvpSelection | null>(null)

  const ready = Boolean(applied.range.startDate && applied.range.endDate)
  const query = {
    channel: applied.channel,
    marketplaces: applied.marketplaces,
    from: applied.range.startDate ?? '',
    to: applied.range.endDate ?? '',
    groupBy: applied.groupBy,
    view: applied.view,
    search: applied.search.trim(),
    page,
    limit: PAGE_SIZE,
  }
  const { data, isLoading, isFetching, isError } = useGetChannelInvpQuery(query, { skip: !ready })
  // Built by the export worker; the file downloads by itself when the server announces it over SSE
  const { start: startExport, isExporting } = useReportExport('channel-invp')
  const { page: _page, limit: _limit, ...exportFilters } = query

  const open = ({ row, marketplace, line, period }: InvpTarget) =>
    setSelection({
      title: `${row.product.sku} · ${marketplace.marketplace} · ${lineLabel(line, applied.channel)} · ${period?.label ?? 'whole range'}`,
      params: { ...query, productId: row.product.id, marketplace: marketplace.marketplace, line, period: period?.key ?? 'all' },
    })

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Channel INVP</h1>
          <p className="mt-1 text-sm text-text-muted">Stock per SKU in our warehouse, in containers and at {CHANNEL_LABEL[applied.channel]}, with daily sales. Click a label or figure to see what it is made of.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!data?.totalRecords || isExporting} onClick={() => void startExport('xlsx', exportFilters)}>
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick filters within the last 3 months, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Channel">
              <SegmentedToggle<InvpChannel> ariaLabel="Channel" value={draft.channel} onChange={(value) => setDraft('channel', value)} options={CHANNEL_OPTIONS} className={cn(FILL_TOGGLE, changed.has('channel') && 'ring-1 ring-primary-500')} />
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
          <FilterItem wide>
            <FormField label="Date range">
              <div className={cn(FILL_PICKER, changed.has('range') && 'ring-1 ring-primary-500')}>
                <DateRangePicker value={draft.range} presets={INVP_PRESETS} minDate={earliestDay()} disableFutureDates onChange={(next) => setDraft('range', withinLookback(next))} placeholder="Pick a date range" />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="View by">
              <SegmentedToggle<InvpGrouping> ariaLabel="View by" value={draft.groupBy} onChange={(value) => setDraft('groupBy', value)} options={GROUPING_OPTIONS} className={cn(FILL_TOGGLE, changed.has('groupBy') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Show as">
              <SegmentedToggle<InvpView> ariaLabel="Show as" value={draft.view} onChange={(value) => setDraft('view', value)} options={VIEW_OPTIONS} className={cn(FILL_TOGGLE, changed.has('view') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <InvpTable report={data} channel={applied.channel} isLoading={isLoading} isError={isError} onOpen={open} />
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />
        )}
      </div>
      <InvpBreakdownModal selection={selection} onClose={() => setSelection(null)} />
    </Container>
  )
}
