'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { PoRef } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'

interface PoOptionSelectProps<T extends PoRef> {
  id?: string
  /** The supplier being paid; the POs offered are its own. */
  partnerId: number | null
  value: PoRef | null
  onChange: (po: T) => void
  /** Loads the POs on offer for the open picker; `skip` while it is closed or no supplier is picked. */
  useOptions: (args: { partnerId: number; search: string }, skip: boolean) => { data?: T[]; isFetching: boolean }
  /** The grey detail shown next to each PO number. */
  renderMeta: (po: T) => React.ReactNode
  emptyText: string
  error?: string
  disabled?: boolean
}

/**
 * The purchase-order picker every PO-based request type shares: a searchable list of one supplier's POs. What differs
 * between types (which POs qualify, what is shown beside each) comes in as `useOptions` and `renderMeta`.
 */
export function PoOptionSelect<T extends PoRef>({ id, partnerId, value, onChange, useOptions, renderMeta, emptyText, error, disabled }: PoOptionSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useOptions({ partnerId: partnerId ?? 0, search: debounced }, !open || !partnerId)

  return (
    <SearchableSelect<PoRef>
      id={id}
      value={value}
      onChange={(po) => onChange(po as T)}
      options={data}
      getKey={(po) => po.id}
      getLabel={(po) => po.poNo}
      renderOption={(po) => (
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">{po.poNo}</span>
          <span className="shrink-0 text-xs text-text-muted">{renderMeta(po as T)}</span>
        </span>
      )}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      placeholder={partnerId ? 'Select a purchase order' : 'Pick the supplier first'}
      searchPlaceholder="PO number, e.g. PO-1043"
      emptyText={emptyText}
      error={error}
      disabled={disabled || !partnerId}
    />
  )
}
