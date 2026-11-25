'use client'

import React from 'react'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FilterBar, FilterItem, FunnelIcon } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Alert } from '@/design-system/alerts'
import { Spinner } from '@/design-system/loaders'
import { useGetOrderChannelsQuery, useGetOrdersOverviewQuery } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { MARKETPLACES } from '@/utils/marketplaces'
import type { ChannelId } from '../../types'
import { AttentionCard, KpiStrip, MarketCard, PerDayCard, PipelineCard, SpendCard } from './OverviewCards'

interface Filters extends Record<string, unknown> {
  channels: ChannelId[]
  countries: string[]
  range: DateRangeValue
}

const DEFAULT_FILTERS: Filters = { channels: [], countries: [], range: { startDate: null, endDate: null } }
const MARKETPLACE_OPTIONS: FilterOption<string>[] = MARKETPLACES.map((marketplace) => ({ value: marketplace.code, label: marketplace.name }))
const day = (value: string | null) => (value ? value.slice(0, 10) : undefined)

/**
 * Shipping › Orders › Overview: what to do next (orders to book, things that need a person), where orders and
 * parcels stand, and what shipping costs, for the channel / marketplace / date range picked. Figures and cards are
 * links into the Orders tab with the same slice applied. One request feeds every card, so they always agree.
 */
export const OverviewTab: React.FC = () => {
  const filters = useStagedFilters(DEFAULT_FILTERS, () => undefined)
  const { draft, setDraft, applied, changed } = filters
  const { data: channels = [], isLoading: loadingChannels } = useGetOrderChannelsQuery()
  const channelOptions: FilterOption<ChannelId>[] = channels.map((channel) => ({ value: channel.id, label: channel.label, disabledReason: channel.connected ? undefined : 'Not connected' }))

  const scope = { channels: applied.channels, countries: applied.countries, from: day(applied.range.startDate), to: day(applied.range.endDate) }
  const { data, isLoading, isFetching, isError, refetch } = useGetOrdersOverviewQuery(scope)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick filters, then filter</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset} applyLabel="Filter" applyIcon={<FunnelIcon />}>
          <FilterItem>
            <FormField label="Channel" htmlFor="overview-channel">
              <FilterMultiSelect id="overview-channel" options={channelOptions} value={draft.channels} onChange={(value) => setDraft('channels', value)} anyLabel="All channels" highlighted={changed.has('channels')} loading={loadingChannels} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Marketplace" htmlFor="overview-marketplace">
              <FilterMultiSelect id="overview-marketplace" options={MARKETPLACE_OPTIONS} value={draft.countries} onChange={(value) => setDraft('countries', value)} anyLabel="All marketplaces" highlighted={changed.has('countries')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Order date">
              <div className={cn(FILL_PICKER, changed.has('range') && 'ring-1 ring-primary-500')}>
                <DateRangePicker value={draft.range} onChange={(range) => setDraft('range', range)} showPresets={false} placeholder="Last 30 days" />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="sm" />
        </div>
      ) : isError || !data ? (
        <Alert variant="danger" className="flex flex-wrap items-center justify-between gap-2">
          Could not load the overview.
          <button type="button" className="font-medium underline" onClick={() => void refetch()}>
            Try again
          </button>
        </Alert>
      ) : (
        <div className={cn('space-y-4', isFetching && 'opacity-70 transition-opacity')}>
          {/* links carry the window the figures covered (the default 30 days included), so the list shows the same orders */}
          <KpiStrip data={data} scope={{ ...scope, from: data.from, to: data.to }} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
            <PipelineCard data={data} scope={{ ...scope, from: data.from, to: data.to }} />
            <PerDayCard data={data} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <AttentionCard data={data} scope={{ ...scope, from: data.from, to: data.to }} />
            <SpendCard data={data} />
            <MarketCard data={data} />
          </div>
        </div>
      )}
    </div>
  )
}
