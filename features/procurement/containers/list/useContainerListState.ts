'use client'

import { useState } from 'react'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import type { SortDirection } from '@/components/sort-header/SortHeader'
import type { ContainerParams, ContainerSortColumn, ContainerStatus, PoDestination, ProductPlatform } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'

const PAGE_SIZE = 20

export type StatusFilter = 'ALL' | ContainerStatus
export type CountryFilter = 'ALL' | PoDestination
export type BrandFilter = 'ALL' | ProductPlatform

export interface ContainerFilters extends Record<string, unknown> {
  status: StatusFilter
  destination: CountryFilter
  brand: BrandFilter
}

const DEFAULT_FILTERS: ContainerFilters = { status: 'ALL', destination: 'ALL', brand: 'ALL' }

/**
 * Search, staged filters and page of a containers listing, and the query params they make; shared by every containers screen.
 * `initialSearch` starts the list on a search (a link to one container).
 */
export function useContainerListState(initialSearch = '') {
  const [search, setSearchText] = useState(initialSearch)
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied } = filters
  // Unsorted keeps the newest container first; a header click sorts earliest first, again latest first
  const [sort, setSort] = useState<{ column: ContainerSortColumn; order: SortDirection } | null>(null)
  const toggleSort = (column: ContainerSortColumn) => {
    setSort((current) => ({ column, order: current?.column === column && current.order === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const params: ContainerParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: sort?.column,
    sortOrder: sort?.order,
    status: applied.status === 'ALL' ? undefined : applied.status,
    destination: applied.destination === 'ALL' ? undefined : applied.destination,
    platform: applied.brand === 'ALL' ? undefined : applied.brand,
  }

  const setSearch = (value: string) => {
    setSearchText(value)
    setPage(1)
  }

  return { search, setSearch, setPage, filters, params, sort, toggleSort, filtered: Boolean(debouncedSearch) || filters.appliedCount > 0 }
}

export type ContainerListState = ReturnType<typeof useContainerListState>
