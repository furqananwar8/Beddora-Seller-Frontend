import { useEffect, useMemo, useState } from 'react'
import { useDebounce } from './useDebounce'

interface PagedSearchOptions {
  pageSize?: number
  /** Milliseconds the query waits after the last keystroke. */
  delay?: number
}

/**
 * Debounced search and paging over a list held in memory. `matches` gets the trimmed, lower-cased query; keep it
 * stable (module level or memoised) so the filter only reruns when the rows or the query change. A new query goes
 * back to page 1.
 */
export function usePagedSearch<T>(
  rows: T[],
  matches: (row: T, query: string) => boolean,
  { pageSize = 25, delay = 300 }: PagedSearchOptions = {}
) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const normalized = query.trim().toLowerCase()
  const debounced = useDebounce(normalized, delay)

  const filtered = useMemo(() => (debounced ? rows.filter((row) => matches(row, debounced)) : rows), [rows, matches, debounced])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const pageRows = useMemo(() => filtered.slice((current - 1) * pageSize, current * pageSize), [filtered, current, pageSize])

  useEffect(() => setPage(1), [debounced])

  return {
    query,
    setQuery,
    /** True while the typed query has not been applied yet. */
    isPending: normalized !== debounced,
    page: current,
    setPage,
    pageSize,
    pageRows,
    totalItems: filtered.length,
    totalPages,
  }
}
