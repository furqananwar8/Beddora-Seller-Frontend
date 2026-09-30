"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useGetShipFromAddressesQuery } from '@/services/api/shipFromAddresses.api'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { AddressFields, AddressForm, emptyAddress, formatAddressLine, toAddress, validateAddress } from './AddressForm'
import type { SavedShipFromAddress, ShipFromAddress } from './types'

/**
 * The address a shipment ships from: a saved address-book entry, or one typed
 * in here. Typed addresses are saved to the book unless the box is unticked.
 */
export type ShipFromChoice =
  | { kind: 'saved'; address: SavedShipFromAddress }
  | { kind: 'manual'; fields: AddressFields; save: boolean }

/** What the API needs for a choice, or null while a typed address is incomplete. */
export function shipFromRequest(choice: ShipFromChoice | null): {
  shipFromAddressId?: number
  shipFromAddress?: ShipFromAddress
  saveShipFromAddress?: boolean
} | null {
  if (!choice) return {}
  if (choice.kind === 'saved') return { shipFromAddressId: Number(choice.address.id) }
  if (Object.keys(validateAddress(choice.fields)).length > 0) return null
  return { shipFromAddress: toAddress(choice.fields), saveShipFromAddress: choice.save }
}

interface ShipFromPickerProps {
  value: ShipFromChoice | null
  onChange: (next: ShipFromChoice | null) => void
  /** Show the typed address's validation messages. */
  showErrors?: boolean
  disabled?: boolean
  /** Heading above the field; null when the surrounding card already has one. */
  label?: string | null
}

export const ShipFromPicker: React.FC<ShipFromPickerProps> = ({ value, onChange, showErrors = false, disabled = false, label = 'Ship from' }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(query, 200)
  const { data: matches = [], isFetching } = useGetShipFromAddressesQuery(debounced.trim() || undefined)
  const { data: all = [], isSuccess } = useGetShipFromAddressesQuery()
  const boxRef = useRef<HTMLDivElement>(null)
  const preselected = useRef(false)

  // Start from the book's default address
  useEffect(() => {
    if (!isSuccess || preselected.current || value) return
    preselected.current = true
    const fallback = all.find((a) => a.isDefault)
    if (fallback) onChange({ kind: 'saved', address: fallback })
  }, [isSuccess, all, value, onChange])

  useEffect(() => {
    const close = (e: MouseEvent) => boxRef.current && !boxRef.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (address: SavedShipFromAddress) => {
    onChange({ kind: 'saved', address })
    setOpen(false)
    setQuery('')
  }

  const startManual = () => {
    onChange({ kind: 'manual', fields: emptyAddress(), save: true })
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={boxRef} className="relative">
      {label && (
        <label htmlFor="ship-from-search" className="mb-1 block text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}

      {value?.kind === 'manual' ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">New address</div>
          <AddressForm value={value.fields} onChange={(fields) => onChange({ ...value, fields })} showErrors={showErrors} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={value.save}
                onChange={(e) => onChange({ ...value, save: e.target.checked })}
                disabled={disabled}
              />
              Save to address book
            </label>
            <button type="button" className="text-sm text-slate-600 underline" onClick={() => onChange(null)} disabled={disabled}>
              Search the address book instead
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            id="ship-from-search"
            type="search"
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={value?.kind === 'saved' ? 'Search to pick another address' : 'Search your address book by name, street, city or postal code'}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            className="h-12 w-full !rounded-lg border border-slate-300 bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-300"
          />

          {open && (
            <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {matches.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => choose(a)}
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {a.label}
                    {a.isDefault && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Default</span>}
                  </div>
                  <div className="text-xs text-slate-600">{formatAddressLine(a)}</div>
                </button>
              ))}
              {matches.length === 0 && !isFetching && (
                <div className="px-4 py-3 text-sm text-slate-600">
                  {query.trim() ? 'No saved address matches.' : 'Your address book is empty.'}
                </div>
              )}
              <button
                type="button"
                onClick={startManual}
                className={cn('block w-full px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50')}
              >
                + Enter an address manually
              </button>
            </div>
          )}

          {value?.kind === 'saved' && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
              <div className="font-semibold text-slate-900">{value.address.label}</div>
              <div className="text-slate-700">
                {value.address.name} · {formatAddressLine(value.address)} · {value.address.phoneNumber}
              </div>
            </div>
          )}
          {!value && isSuccess && all.length === 0 && (
            <p className="mt-2 text-xs text-slate-600">
              No address saved yet. Type one manually, or add addresses in Settings. Without one, the INBOUND_SHIP_FROM_* server settings are used.
            </p>
          )}
        </>
      )}
    </div>
  )
}
