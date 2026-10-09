'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { CostCenterOption } from '@/services/api/finance.api'

interface CostCenterSelectProps {
  id?: string
  options: CostCenterOption[] | undefined
  loading?: boolean
  /** The picked cost center's id; null when none. */
  value: number | null
  onChange: (option: CostCenterOption) => void
  error?: string
  /** Where "+ Create new" leads (the cost center screen, returning to this form). */
  addHref: string
  /** Runs just before leaving to add one, e.g. to keep what was typed. */
  onAdd?: () => void
}

/** The expense (an L4 cost center) to book to: a searchable dropdown ending with a link to create one, as on the partner picker. */
export const CostCenterSelect: React.FC<CostCenterSelectProps> = ({ id, options, loading, value, onChange, error, addHref, onAdd }) => {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const shown = useMemo(
    () => (options ?? []).filter((option) => !term || option.path.toLowerCase().includes(term) || option.code.toLowerCase().includes(term)),
    [options, term]
  )
  const selected = options?.find((option) => option.id === value) ?? null
  const addLink = (className: string, label: string) => (
    <Link href={addHref} onClick={onAdd} className={className}>
      {label}
    </Link>
  )

  return (
    <SearchableSelect<CostCenterOption>
      id={id}
      value={selected}
      onChange={onChange}
      options={shown}
      getKey={(option) => option.id}
      getLabel={(option) => option.path}
      renderOption={(option) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{option.name}</span>
          <span className="truncate text-xs text-text-muted">
            {option.code} · {option.path}
          </span>
        </span>
      )}
      search={search}
      onSearchChange={setSearch}
      loading={loading}
      placeholder="Select an expense"
      searchPlaceholder="Search by name or code..."
      emptyText={options && options.length === 0 ? 'No expenses yet. Create one below.' : 'Nothing matches.'}
      error={error}
      footer={addLink('block rounded-md px-2 pb-1 pt-2 text-sm font-medium text-primary-600 hover:underline', '+ Create new')}
    />
  )
}
