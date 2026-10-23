'use client'

import React from 'react'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FormField } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { cn } from '@/utils/cn'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, DESTINATION_LABEL } from '../../shared/poMeta'
import type { ContainerListState, CountryFilter, StatusFilter } from './useContainerListState'

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [{ value: 'ALL', label: 'All' }, ...CONTAINER_STATUSES.map((value) => ({ value, label: CONTAINER_STATUS_META[value].label }))]
const COUNTRY_OPTIONS: Array<{ value: CountryFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'US', label: DESTINATION_LABEL.US },
  { value: 'CA', label: DESTINATION_LABEL.CA },
]

/** Search, status and country over a containers listing. */
export const ContainerFilterBar: React.FC<{ state: ContainerListState; idPrefix: string }> = ({ state, idPrefix }) => {
  const { filters, search, setSearch } = state
  const { draft, setDraft, changed } = filters
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
      <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
        <FilterItem wide>
          <FormField label="Search" htmlFor={`${idPrefix}-search`}>
            <input
              id={`${idPrefix}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Container #, CID, BOL, PL # or PO #"
              className="ds-input ds-input-default rounded-lg"
            />
          </FormField>
        </FilterItem>
        <FilterItem wide>
          <FormField label="Status">
            <SegmentedToggle<StatusFilter> ariaLabel="Status" value={draft.status} onChange={(v) => setDraft('status', v)} options={STATUS_OPTIONS} className={cn(FILL_TOGGLE, changed.has('status') && 'ring-1 ring-primary-500')} />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Country">
            <SegmentedToggle<CountryFilter> ariaLabel="Country" value={draft.destination} onChange={(v) => setDraft('destination', v)} options={COUNTRY_OPTIONS} className={cn(FILL_TOGGLE, changed.has('destination') && 'ring-1 ring-primary-500')} />
          </FormField>
        </FilterItem>
      </FilterBar>
    </div>
  )
}
