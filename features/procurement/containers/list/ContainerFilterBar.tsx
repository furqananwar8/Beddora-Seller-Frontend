'use client'

import React from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FormField } from '@/components/form-field/FormField'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, DESTINATION_LABEL } from '../../shared/poMeta'
import { PLATFORM_META, PLATFORMS } from '../../shared/platformMeta'
import type { ContainerListState } from './useContainerListState'

const STATUS_OPTIONS = CONTAINER_STATUSES.map((value) => ({ value, label: CONTAINER_STATUS_META[value].label }))
const COUNTRY_OPTIONS = (['US', 'CA'] as const).map((value) => ({ value, label: DESTINATION_LABEL[value] }))
const BRAND_OPTIONS = PLATFORMS.map((value) => ({ value, label: PLATFORM_META[value].label }))

/** Search, status, country and brand over a containers listing. */
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
              placeholder="Container #, CID, BOL, PL #, PO #, SKU, UPC or ASIN"
              className="ds-input ds-input-default rounded-lg"
            />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Status" htmlFor={`${idPrefix}-status`}>
            <FilterMultiSelect id={`${idPrefix}-status`} options={STATUS_OPTIONS} value={draft.status} onChange={(v) => setDraft('status', v)} anyLabel="All statuses" highlighted={changed.has('status')} />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Country" htmlFor={`${idPrefix}-country`}>
            <FilterMultiSelect id={`${idPrefix}-country`} options={COUNTRY_OPTIONS} value={draft.destination} onChange={(v) => setDraft('destination', v)} anyLabel="All countries" highlighted={changed.has('destination')} />
          </FormField>
        </FilterItem>
        <FilterItem>
          <FormField label="Brand" htmlFor={`${idPrefix}-brand`}>
            <FilterMultiSelect id={`${idPrefix}-brand`} options={BRAND_OPTIONS} value={draft.brand} onChange={(v) => setDraft('brand', v)} anyLabel="All brands" highlighted={changed.has('brand')} />
          </FormField>
        </FilterItem>
      </FilterBar>
    </div>
  )
}
