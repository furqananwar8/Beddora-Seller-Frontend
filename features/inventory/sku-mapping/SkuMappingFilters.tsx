'use client'

import React from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { SkuMappingChannel } from '@/services/api/skuMapping.api'
import type { SkuMappingFilterValues } from './filters'

interface SkuMappingFiltersProps {
  channels: SkuMappingChannel[]
  filters: {
    draft: SkuMappingFilterValues
    setDraft: <K extends keyof SkuMappingFilterValues>(key: K, value: SkuMappingFilterValues[K]) => void
    changed: Set<keyof SkuMappingFilterValues>
    activeCount: number
    apply: () => void
    reset: () => void
  }
}

const toOptions = (options: Array<{ id: string; name: string }> = []) => options.map(({ id, name }) => ({ value: id, label: name }))

/** Search, channel, marketplace and fulfillment, staged until Apply filters (same bar as the other list screens). */
export const SkuMappingFilters: React.FC<SkuMappingFiltersProps> = ({ channels, filters }) => {
  const { draft, setDraft, changed } = filters
  const channel = channels.find((option) => option.id === draft.channel) ?? null

  const selectChannel = (next: SkuMappingChannel) => {
    if (next.id === draft.channel) return
    // Marketplace and fulfillment options belong to the channel
    setDraft('channel', next.id)
    setDraft('marketplaces', [])
    setDraft('fulfillments', [])
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
      <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
        <FilterItem wide>
          <FormField label="Search" htmlFor="sku-mapping-search">
            <input
              id="sku-mapping-search"
              type="search"
              value={draft.search}
              onChange={(event) => setDraft('search', event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
              placeholder={channel?.referenceLabel ? `SKU, ${channel.referenceLabel} or product` : 'SKU or product'}
              className={changed.has('search') ? 'ds-input rounded-lg border-primary-500 ring-1 ring-primary-500' : 'ds-input ds-input-default rounded-lg'}
            />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Channel" htmlFor="sku-mapping-channel">
            <SearchableSelect<SkuMappingChannel>
              id="sku-mapping-channel"
              value={channel}
              onChange={selectChannel}
              options={channels}
              getKey={(option) => option.id}
              getLabel={(option) => option.name}
              highlighted={changed.has('channel')}
              loading={channels.length === 0}
            />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Marketplace" htmlFor="sku-mapping-marketplace">
            <FilterMultiSelect
              id="sku-mapping-marketplace"
              options={toOptions(channel?.marketplaces)}
              value={draft.marketplaces}
              onChange={(value) => setDraft('marketplaces', value)}
              anyLabel="All marketplaces"
              highlighted={changed.has('marketplaces')}
            />
          </FormField>
        </FilterItem>
        {channel && channel.fulfillments.length > 0 && (
          <FilterItem>
            <FormField label="Fulfillment" htmlFor="sku-mapping-fulfillment">
              <FilterMultiSelect
                id="sku-mapping-fulfillment"
                options={toOptions(channel.fulfillments)}
                value={draft.fulfillments}
                onChange={(value) => setDraft('fulfillments', value)}
                anyLabel="All fulfillment"
                highlighted={changed.has('fulfillments')}
              />
            </FormField>
          </FilterItem>
        )}
      </FilterBar>
    </div>
  )
}
