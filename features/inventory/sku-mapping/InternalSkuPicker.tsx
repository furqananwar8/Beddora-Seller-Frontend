'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetInternalSkusQuery, type InternalSku } from '@/services/api/skuMapping.api'
import { useDebounce } from '@/utils/debounce'

/** Most SKUs the closed picker lists by name. */
const MAX_NAMED = 2

interface InternalSkuPickerProps {
  /** The selected channel SKU: picking binds to it ×1; without one the node is only placed. */
  bindTo: string | null
  /** Ticked: bound to the selected channel SKU, or only placed when none is selected. */
  value: InternalSku[]
  onAdd: (items: InternalSku[]) => void
  onRemove: (productIds: number[]) => void
  disabled?: boolean
}

/** "+ Add internal SKU": Procurement products with a SKU, searchable, with warehouse on-hand. */
export const InternalSkuPicker: React.FC<InternalSkuPickerProps> = ({ bindTo, value, onAdd, onRemove, disabled }) => {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const term = useDebounce(search.trim(), 300)
  const { data = [], isFetching } = useGetInternalSkusQuery(term, { skip: !open })

  const change = (next: InternalSku[]) => {
    const before = new Set(value.map((item) => item.productId))
    const after = new Set(next.map((item) => item.productId))
    const added = next.filter((item) => !before.has(item.productId))
    const removed = value.filter((item) => !after.has(item.productId)).map((item) => item.productId)
    if (added.length > 0) onAdd(added)
    if (removed.length > 0) onRemove(removed)
  }

  return (
    <SearchableSelect<InternalSku>
      multiple
      ariaLabel="Add internal SKUs"
      className="w-full sm:w-[28rem]"
      value={value}
      onChange={change}
      options={data}
      getKey={(item) => item.productId}
      getLabel={(item) => item.sku}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      disabled={disabled}
      placeholder="+ Add internal SKUs"
      // Name the SKUs picked so it is clear what is mapped; a long list falls back to a count
      renderValue={(items) => (items.length <= MAX_NAMED ? items.map((item) => item.sku).join(', ') : `Internal SKUs · ${items.length}`)}
      triggerClassName="text-text-primary [&>span]:text-text-primary"
      searchPlaceholder="Search internal SKU or product"
      emptyText="No internal SKU matches. Add a SKU to the product under Procurement > Products."
      renderOption={(item) => (
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-mono text-xs text-text-primary">{item.sku}</span>
            <span className="block truncate text-xs text-text-muted">{item.name}</span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-text-muted">{item.onHand === null ? 'No stock record' : `On hand ${item.onHand.toLocaleString()}`}</span>
        </span>
      )}
      footer={
        <p className="px-2 py-1 text-xs text-text-muted">
          {bindTo ? (
            <>
              Ticking binds to <span className="font-mono text-text-primary">{bindTo}</span> ×1; unticking unbinds
            </>
          ) : (
            'Select a channel SKU to bind; otherwise the SKU is only placed on the graph.'
          )}
        </p>
      }
    />
  )
}
