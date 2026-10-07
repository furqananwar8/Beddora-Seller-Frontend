'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetContainersQuery, type ContainerItem } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'
import { formatDay } from '../shared/format'

interface ContainerSelectProps {
  id?: string
  /** The request's stored container number (may predate the container list). */
  value: string
  onChange: (container: ContainerItem | null) => void
  error?: string
  disabled?: boolean
}

interface ContainerOption {
  key: string
  label: string
  container: ContainerItem | null
}

const DESTINATION: Record<ContainerItem['destination'], string> = { US: 'USA', CA: 'Canada' }

/** The number a payment request stores; the container page links payments by the shipping line's number. */
export const containerRefOf = (container: ContainerItem): string => container.containerNumber ?? container.containerNo

const toOption = (container: ContainerItem): ContainerOption => ({ key: String(container.id), label: containerRefOf(container), container })

/** The container a payment request is for, picked from the container listing. */
export const ContainerSelect: React.FC<ContainerSelectProps> = ({ id, value, onChange, error, disabled }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data, isFetching } = useGetContainersQuery({ page: 1, limit: 20, search: debounced || undefined }, { skip: !open })
  const selected: ContainerOption | null = value ? { key: `value:${value}`, label: value, container: null } : null

  return (
    <SearchableSelect<ContainerOption>
      id={id}
      value={selected}
      onChange={(option) => onChange(option.container)}
      options={(data?.data ?? []).map(toOption)}
      getKey={(option) => option.key}
      getLabel={(option) => option.label}
      renderOption={(option) =>
        option.container && (
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium">
              {option.label}
              {option.container.containerNumber && <span className="ml-1 text-xs text-text-muted">{option.container.containerNo}</span>}
            </span>
            <span className="shrink-0 text-xs text-text-muted">
              {DESTINATION[option.container.destination]} · ETA {option.container.eta ? formatDay(option.container.eta) : "—"}
            </span>
          </span>
        )
      }
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      placeholder="Select a container"
      searchPlaceholder="Container no., CID#, B/L"
      emptyText="No container matches."
      error={error}
      disabled={disabled}
      footer={
        value && !disabled
          ? (close) => (
              <button type="button" className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-muted" onClick={() => { onChange(null); close() }}>
                No container
              </button>
            )
          : undefined
      }
    />
  )
}
