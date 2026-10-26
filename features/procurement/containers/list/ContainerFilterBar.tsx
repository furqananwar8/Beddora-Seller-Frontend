'use client'

import React from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, DESTINATION_LABEL } from '../../shared/poMeta'
import type { ContainerListState, CountryFilter, StatusFilter } from './useContainerListState'

type Option<T> = { value: T; label: string }

const STATUS_OPTIONS: Array<Option<StatusFilter>> = [{ value: 'ALL', label: 'All statuses' }, ...CONTAINER_STATUSES.map((value) => ({ value, label: CONTAINER_STATUS_META[value].label }))]
const COUNTRY_OPTIONS: Array<Option<CountryFilter>> = [
  { value: 'ALL', label: 'All countries' },
  { value: 'US', label: DESTINATION_LABEL.US },
  { value: 'CA', label: DESTINATION_LABEL.CA },
]

interface FilterSelectProps<T extends string> {
  id: string
  options: Array<Option<T>>
  value: T
  onChange: (value: T) => void
  highlighted: boolean
}

/** One-of-a-fixed-list filter on the shared select. */
function FilterSelect<T extends string>({ id, options, value, onChange, highlighted }: FilterSelectProps<T>) {
  return (
    <SearchableSelect<Option<T>>
      id={id}
      value={options.find((option) => option.value === value) ?? options[0]}
      onChange={(option) => onChange(option.value)}
      options={options}
      getKey={(option) => option.value}
      getLabel={(option) => option.label}
      highlighted={highlighted}
    />
  )
}

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
        <FilterItem>
          <FormField label="Status" htmlFor={`${idPrefix}-status`}>
            <FilterSelect id={`${idPrefix}-status`} options={STATUS_OPTIONS} value={draft.status} onChange={(v) => setDraft('status', v)} highlighted={changed.has('status')} />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Country" htmlFor={`${idPrefix}-country`}>
            <FilterSelect id={`${idPrefix}-country`} options={COUNTRY_OPTIONS} value={draft.destination} onChange={(v) => setDraft('destination', v)} highlighted={changed.has('destination')} />
          </FormField>
        </FilterItem>
      </FilterBar>
    </div>
  )
}
