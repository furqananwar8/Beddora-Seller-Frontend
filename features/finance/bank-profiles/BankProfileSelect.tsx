'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetBankProfilesQuery, type BankProfile } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { BankProfileDialog } from './BankProfileDialog'

const OPTION_LIMIT = 20

interface BankProfileSelectProps {
  id?: string
  selected: BankProfile | null
  error?: string
  onSelect: (profile: BankProfile) => void
}

/** Searchable company bank dropdown ending with '+ Add bank profile', which is created in place and selected. */
export const BankProfileSelect: React.FC<BankProfileSelectProps> = ({ id, selected, error, onSelect }) => {
  const { canWriteBankProfiles } = useFinanceCapabilities()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data, isFetching } = useGetBankProfilesQuery({ search: debounced, page: 1, limit: OPTION_LIMIT }, { skip: !open })

  return (
    <>
      <SearchableSelect<BankProfile>
        id={id}
        value={selected}
        onChange={onSelect}
        options={data?.data ?? []}
        getKey={(profile) => profile.id}
        getLabel={(profile) => profile.name}
        renderOption={(profile) => (
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">
              {profile.name} <span className="text-text-muted">· {profile.label}</span>
            </span>
            <span className="shrink-0 text-xs font-medium text-text-muted">{profile.currency}</span>
          </span>
        )}
        renderValue={(profile) => `${profile.name} · ${profile.currency}`}
        search={search}
        onSearchChange={setSearch}
        onOpenChange={setOpen}
        loading={isFetching}
        placeholder="Select a bank"
        searchPlaceholder="Search banks..."
        emptyText="No bank profiles found."
        error={error}
        footer={
          canWriteBankProfiles
            ? (close) => (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    setAdding(true)
                  }}
                  className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline"
                >
                  + Add bank profile
                </button>
              )
            : undefined
        }
      />
      <BankProfileDialog isOpen={adding} onClose={() => setAdding(false)} onSaved={onSelect} />
    </>
  )
}
