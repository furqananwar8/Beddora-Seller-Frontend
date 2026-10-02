'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetSupplierOptionsQuery, type SupplierRef } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'

interface SupplierSelectProps {
  id?: string
  value: SupplierRef | null
  onChange: (supplier: SupplierRef) => void
  error?: string
  disabled?: boolean
}

/**
 * The one supplier dropdown for procurement (PO, packaging list, price analysis): partners of type Supplier.
 * "+ New supplier" opens the partner form in a new tab so the half-filled form here is never lost;
 * the new supplier shows up live (partner events refresh this list).
 */
export const SupplierSelect: React.FC<SupplierSelectProps> = ({ id, value, onChange, error, disabled }) => {
  const ability = useAppAbility()
  const canAddSupplier = ability.can('write', 'finance:partner-profile')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useGetSupplierOptionsQuery(debounced, { skip: !open })

  return (
    <SearchableSelect<SupplierRef>
      id={id}
      value={value}
      onChange={onChange}
      options={data}
      getKey={(supplier) => supplier.id}
      getLabel={(supplier) => supplier.name}
      renderOption={(supplier) => (
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{supplier.name}</span>
          {supplier.contactName && <span className="shrink-0 text-xs text-text-muted">{supplier.contactName}</span>}
        </span>
      )}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      placeholder="Select a supplier"
      searchPlaceholder="Search suppliers..."
      emptyText="No supplier by that name."
      error={error}
      disabled={disabled}
      footer={
        canAddSupplier ? (
          <a
            href="/dashboard/finance/partner-profile/new?type=SUPPLIER"
            target="_blank"
            rel="noopener"
            className="block rounded-md px-2 pb-1 pt-2 text-sm font-medium text-primary-600 hover:underline"
          >
            + New supplier
          </a>
        ) : undefined
      }
    />
  )
}
