import { useState } from 'react'
import { useDebounce } from '@/utils/debounce'

/** Search, status and page of one platform's list; changing a filter goes back to the first page. */
export function useListFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  return {
    search,
    status,
    page,
    setPage,
    setSearch: (value: string) => {
      setSearch(value)
      setPage(1)
    },
    setStatus: (value: string) => {
      setStatus(value)
      setPage(1)
    },
    /** What to send to the API. */
    params: { search: debouncedSearch, status: status === 'ALL' ? undefined : status },
    filtered: Boolean(debouncedSearch) || status !== 'ALL',
  }
}
