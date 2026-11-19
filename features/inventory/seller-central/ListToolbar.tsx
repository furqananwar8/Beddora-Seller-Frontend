"use client"

import React from 'react'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { cn } from '@/utils/cn'

/** Every control in the toolbars is this tall, so inputs, dropdowns, the date picker and buttons line up. */
export const CONTROL = 'h-[42px]'

interface Props {
  search: string
  onSearch: (value: string) => void
  placeholder: string
  statusOptions: { id: string; name: string }[]
  status: string
  onStatus: (value: string) => void
}

/** Search box and status filter above a platform's list. */
export const ListToolbar: React.FC<Props> = ({ search, onSearch, placeholder, statusOptions, status, onStatus }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3">
    <input
      type="search"
      placeholder={placeholder}
      aria-label="Search shipments"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      className={cn(
        CONTROL,
        'min-w-0 flex-1 basis-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 sm:min-w-[260px] sm:basis-auto sm:max-w-md'
      )}
    />
    <MultiSelectInput single title="Status" options={statusOptions} value={[status]} onChange={(value) => onStatus(value[0] ?? 'ALL')} />
  </div>
)
