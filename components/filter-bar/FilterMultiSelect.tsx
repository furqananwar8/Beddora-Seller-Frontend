'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'

export interface FilterOption<V extends string | number = string> {
  value: V
  label: string
}

interface FilterMultiSelectProps<V extends string | number> {
  id: string
  options: FilterOption<V>[]
  value: V[]
  onChange: (value: V[]) => void
  /** Shown when nothing is picked, e.g. "Any supplier". */
  anyLabel: string
  /** Changed since the last apply. */
  highlighted?: boolean
  loading?: boolean
}

/** A searchable multi-select filter box. An empty selection means "any". */
export function FilterMultiSelect<V extends string | number>({ id, options, value, onChange, anyLabel, highlighted, loading }: FilterMultiSelectProps<V>) {
  const selected = options.filter((option) => value.includes(option.value))
  return (
    <SearchableSelect<FilterOption<V>>
      id={id}
      multiple
      value={selected}
      onChange={(next) => onChange(next.map((option) => option.value))}
      options={options}
      getKey={(option) => String(option.value)}
      getLabel={(option) => option.label}
      renderValue={(picked) => (picked.length <= 2 ? picked.map((option) => option.label).join(', ') : `${picked.length} selected`)}
      placeholder={anyLabel}
      searchPlaceholder="Search..."
      highlighted={highlighted}
      loading={loading}
    />
  )
}
