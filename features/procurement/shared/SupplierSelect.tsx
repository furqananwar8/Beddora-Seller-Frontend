'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetSupplierOptionsQuery, type SupplierRef } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'

/** Server-searched suppliers, fetched only while the dropdown is open. */
function useSupplierOptions() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useGetSupplierOptionsQuery(debounced, { skip: !open })
  return { search, setSearch, setOpen, options: data, isFetching }
}

const SupplierOption: React.FC<{ supplier: SupplierRef }> = ({ supplier }) => (
  <span className="flex items-center justify-between gap-2">
    <span className="truncate">{supplier.name}</span>
    {supplier.contactName && <span className="shrink-0 text-xs text-text-muted">{supplier.contactName}</span>}
  </span>
)

/**
 * "+ New supplier" opens the partner form in a new tab so the half-filled form here is never lost;
 * the new supplier shows up live (partner events refresh this list).
 */
function useNewSupplierFooter() {
  const ability = useAppAbility()
  if (!ability.can('write', 'finance:partner-profile')) return undefined
  return (
    <a
      href="/dashboard/finance/partner-profile/new?type=SUPPLIER"
      target="_blank"
      rel="noopener"
      className="block rounded-md px-2 pb-1 pt-2 text-sm font-medium text-primary-600 hover:underline"
    >
      + New supplier
    </a>
  )
}

interface SupplierSelectProps {
  id?: string
  value: SupplierRef | null
  onChange: (supplier: SupplierRef) => void
  error?: string
  disabled?: boolean
}

/** The one supplier dropdown for procurement (PO, packaging list, price analysis): partners of type Supplier. */
export const SupplierSelect: React.FC<SupplierSelectProps> = ({ id, value, onChange, error, disabled }) => {
  const lookup = useSupplierOptions()
  const footer = useNewSupplierFooter()

  return (
    <SearchableSelect<SupplierRef>
      id={id}
      value={value}
      onChange={onChange}
      options={lookup.options}
      getKey={(supplier) => supplier.id}
      getLabel={(supplier) => supplier.name}
      renderOption={(supplier) => <SupplierOption supplier={supplier} />}
      search={lookup.search}
      onSearchChange={lookup.setSearch}
      onOpenChange={lookup.setOpen}
      loading={lookup.isFetching}
      placeholder="Select a supplier"
      searchPlaceholder="Search suppliers..."
      emptyText="No supplier by that name."
      error={error}
      disabled={disabled}
      footer={footer}
    />
  )
}

interface SupplierMultiSelectProps {
  id?: string
  value: SupplierRef[]
  onChange: (suppliers: SupplierRef[]) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

/** Tick several suppliers at once ("Add suppliers" on price analysis); same list and "+ New supplier" as above. */
export const SupplierMultiSelect: React.FC<SupplierMultiSelectProps> = ({ id, value, onChange, placeholder = 'Select one or more suppliers', error, disabled }) => {
  const lookup = useSupplierOptions()
  const footer = useNewSupplierFooter()

  return (
    <SearchableSelect<SupplierRef>
      id={id}
      multiple
      value={value}
      onChange={onChange}
      options={lookup.options}
      getKey={(supplier) => supplier.id}
      getLabel={(supplier) => supplier.name}
      renderValue={() => placeholder}
      renderOption={(supplier) => <SupplierOption supplier={supplier} />}
      search={lookup.search}
      onSearchChange={lookup.setSearch}
      onOpenChange={lookup.setOpen}
      loading={lookup.isFetching}
      placeholder={placeholder}
      searchPlaceholder="Search suppliers..."
      emptyText="No supplier by that name."
      error={error}
      disabled={disabled}
      footer={footer}
    />
  )
}
