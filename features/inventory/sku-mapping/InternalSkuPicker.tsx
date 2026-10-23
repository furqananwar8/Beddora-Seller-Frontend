'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetInternalSkusQuery, type InternalSku } from '@/services/api/skuMapping.api'
import { useDebounce } from '@/utils/debounce'

interface InternalSkuPickerProps {
  /** The selected channel SKU: picking binds to it ×1; without one the node is only placed. */
  bindTo: string | null
  onPick: (internal: InternalSku) => void
  disabled?: boolean
}

/** "+ Add internal SKU": Procurement products with a SKU, searchable, with warehouse on-hand. */
export const InternalSkuPicker: React.FC<InternalSkuPickerProps> = ({ bindTo, onPick, disabled }) => {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const term = useDebounce(search.trim(), 300)
  const { data = [], isFetching } = useGetInternalSkusQuery(term, { skip: !open })

  return (
    <SearchableSelect<InternalSku>
      ariaLabel="Add internal SKU"
      className="w-full sm:w-56"
      value={null}
      onChange={onPick}
      options={data}
      getKey={(item) => item.productId}
      getLabel={(item) => item.sku}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      disabled={disabled}
      placeholder="+ Add internal SKU"
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
              Picking binds it to <span className="font-mono text-text-primary">{bindTo}</span> ×1
            </>
          ) : (
            'Select a channel SKU to bind; otherwise the SKU is only placed on the graph.'
          )}
        </p>
      }
    />
  )
}
