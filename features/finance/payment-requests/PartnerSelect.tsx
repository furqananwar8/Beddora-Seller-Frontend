'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PartnerOption, useGetPartnerOptionsQuery } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { countryLabel } from '../shared/countryLabel'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'

interface PartnerSelectProps {
  id?: string
  selected: PartnerOption | null
  error?: string
  onSelect: (partner: PartnerOption) => void
  /** Where '+ Add new partner' leads; defaults to the plain partner form. */
  addPartnerHref?: string
  /** Runs just before navigating to add a partner, e.g. to stash the form. */
  onAddPartner?: () => void
}

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700">{children}</span>
)

/** Chips summarising the chosen partner: type, country, currency and payment method. */
export const PartnerChips: React.FC<{ partner: PartnerOption }> = ({ partner }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    <Chip>{partner.type === 'VENDOR' ? 'Vendor' : 'Supplier'}</Chip>
    {partner.country && <Chip>{countryLabel(partner.country)}</Chip>}
    <Chip>{partner.currency}</Chip>
    {partner.paymentMethod && <Chip>{partner.paymentMethod}</Chip>}
  </div>
)

type PartnerLike = Pick<PartnerOption, 'id' | 'name' | 'type' | 'country' | 'currency'> & { contactName?: string | null }

/** The dropdown's option shape from any partner record the screen already holds. */
export const toPartnerOption = (partner: PartnerLike): PartnerOption => ({
  id: partner.id,
  name: partner.name,
  type: partner.type,
  contactName: partner.contactName ?? null,
  country: partner.country,
  currency: partner.currency,
  paymentMethod: null,
})

/** Searchable partner dropdown that ends with a link to create a new partner. */
export const PartnerSelect: React.FC<PartnerSelectProps> = ({ id, selected, error, onSelect, addPartnerHref, onAddPartner }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data, isFetching } = useGetPartnerOptionsQuery(debounced, { skip: !open })

  return (
    <SearchableSelect<PartnerOption>
      id={id}
      value={selected}
      onChange={onSelect}
      options={data ?? []}
      getKey={(partner) => partner.id}
      getLabel={(partner) => partner.name}
      renderOption={(partner) => (
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{partner.name}</span>
          <span className="shrink-0 text-xs text-text-muted">{partner.type === 'VENDOR' ? 'Vendor' : 'Supplier'}</span>
        </span>
      )}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      placeholder="Select a partner"
      searchPlaceholder="Search partners..."
      emptyText="No partners found."
      error={error}
      footer={
        <Link
          href={addPartnerHref ?? '/dashboard/finance/partner-profile/new'}
          onClick={onAddPartner}
          className="block rounded-md px-2 pb-1 pt-2 text-sm font-medium text-primary-600 hover:underline"
        >
          + Add new partner
        </Link>
      }
    />
  )
}
