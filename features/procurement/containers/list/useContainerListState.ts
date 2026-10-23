'use client'

import { useState } from 'react'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import type { ContainerParams, ContainerStatus, PoDestination } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'

const PAGE_SIZE = 20

export type StatusFilter = 'ALL' | ContainerStatus
export type CountryFilter = 'ALL' | PoDestination

export interface ContainerFilters extends Record<string, unknown> {
  status: StatusFilter
  destination: CountryFilter
}

const DEFAULT_FILTERS: ContainerFilters = { status: 'ALL', destination: 'ALL' }

/** Search, staged filters and page of a containers listing, and the query params they make; shared by every containers screen. */
export function useContainerListState() {
  const [search, setSearchText] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied } = filters

  const params: ContainerParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: applied.status === 'ALL' ? undefined : applied.status,
    destination: applied.destination === 'ALL' ? undefined : applied.destination,
  }

  const setSearch = (value: string) => {
    setSearchText(value)
    setPage(1)
  }

  return { search, setSearch, setPage, filters, params, filtered: Boolean(debouncedSearch) || filters.appliedCount > 0 }
}

export type ContainerListState = ReturnType<typeof useContainerListState>
