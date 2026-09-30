'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PartnerOption, useGetPartnerOptionsQuery } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { fieldClass } from '../shared/FormField'

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
    {partner.country && <Chip>{partner.country}</Chip>}
    <Chip>{partner.currency}</Chip>
    {partner.paymentMethod && <Chip>{partner.paymentMethod}</Chip>}
  </div>
)

/** Searchable partner dropdown that ends with a link to create a new partner. */
export const PartnerSelect: React.FC<PartnerSelectProps> = ({ id, selected, error, onSelect, addPartnerHref, onAddPartner }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data, isFetching } = useGetPartnerOptionsQuery(debounced, { skip: !open })
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={wrapper} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(fieldClass(error), 'flex items-center justify-between text-left')}
      >
        <span className={cn('truncate', !selected && 'text-text-muted')}>{selected?.name ?? 'Select a partner'}</span>
        <span aria-hidden className="ml-2 text-xs text-text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface p-2 shadow-lg">
          <input
            autoFocus
            type="search"
            aria-label="Search partners"
            placeholder="Search partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ds-input ds-input-default mb-2 w-full rounded-lg"
          />
          <ul role="listbox" className="max-h-56 overflow-auto">
            {(data ?? []).map((partner) => (
              <li key={partner.id} role="option" aria-selected={partner.id === selected?.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(partner)
                    setOpen(false)
                  }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary-50', partner.id === selected?.id && 'bg-secondary-100')}
                >
                  <span className="truncate">{partner.name}</span>
                  <span className="shrink-0 text-xs text-text-muted">{partner.type === 'VENDOR' ? 'Vendor' : 'Supplier'}</span>
                </button>
              </li>
            ))}
            {!isFetching && (data ?? []).length === 0 && <li className="px-2 py-3 text-center text-sm text-text-muted">No partners found.</li>}
            {isFetching && <li className="px-2 py-3 text-center text-sm text-text-muted">Searching...</li>}
          </ul>
          <Link
            href={addPartnerHref ?? '/dashboard/finance/partner-profile/new'}
            onClick={onAddPartner}
            className="mt-1 block rounded-md border-t border-border px-2 pb-1 pt-3 text-sm font-medium text-primary-600 hover:underline"
          >
            + Add new partner
          </Link>
        </div>
      )}
    </div>
  )
}
