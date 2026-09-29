"use client"

import React, { useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'
import { countryName } from './countries'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import {
  useCreateShipFromAddressMutation,
  useDeleteShipFromAddressMutation,
  useGetShipFromAddressesQuery,
  useSetDefaultShipFromAddressMutation,
  useUpdateShipFromAddressMutation,
} from '@/services/api/shipFromAddresses.api'
import { apiErrorMessage } from './useShipments'
import { AddressFields, AddressForm, emptyAddress, fieldsFrom, toAddress, validateAddress } from './AddressForm'
import type { SavedShipFromAddress } from './types'

/**
 * Ship-from address book (Settings). Shipments pick from here when they're
 * created; typed-in addresses are added to it automatically.
 */
export const AddressBook: React.FC = () => {
  const dispatch = useAppDispatch()
  const { data: addresses = [], isLoading } = useGetShipFromAddressesQuery()
  const [create] = useCreateShipFromAddressMutation()
  const [update] = useUpdateShipFromAddressMutation()
  const [remove] = useDeleteShipFromAddressMutation()
  const [makeDefault] = useSetDefaultShipFromAddressMutation()

  // editing: null = closed, 'new' = adding, otherwise the entry being edited
  const [editing, setEditing] = useState<SavedShipFromAddress | 'new' | null>(null)
  const [fields, setFields] = useState<AddressFields>(emptyAddress())
  const [asDefault, setAsDefault] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SavedShipFromAddress | null>(null)

  const notify = (message: string, type: 'success' | 'error') => dispatch(addNotification({ message, type }))

  const openForm = (target: SavedShipFromAddress | 'new') => {
    setEditing(target)
    setFields(target === 'new' ? emptyAddress() : fieldsFrom(target))
    setAsDefault(false)
    setShowErrors(false)
    setError(null)
  }

  const save = async () => {
    if (Object.keys(validateAddress(fields)).length > 0) return setShowErrors(true)
    setSaving(true)
    setError(null)
    try {
      const address = toAddress(fields)
      if (editing === 'new') await create({ ...address, isDefault: asDefault }).unwrap()
      else if (editing) await update({ id: editing.id, address }).unwrap()
      notify(editing === 'new' ? 'Address added' : 'Address updated', 'success')
      setEditing(null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the address'))
    } finally {
      setSaving(false)
    }
  }

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn()
      notify(success, 'success')
    } catch (err) {
      notify(apiErrorMessage(err, 'Something went wrong'), 'error')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Ship-from addresses</h3>
          <p className="mt-1 text-sm text-text-muted">
            Warehouses and suppliers your FBA shipments leave from. Pick one when you create a shipment; addresses typed in
            there are saved here.
          </p>
        </div>
        <Button onClick={() => openForm('new')}>+ Add address</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="sm" />
        </div>
      ) : addresses.length === 0 ? (
        <p className="p-8 text-center text-sm text-text-muted">No addresses yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={cn(
                'flex flex-col justify-between rounded-lg border bg-white p-4',
                a.isDefault ? 'border-secondary-800' : 'border-gray-200'
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-text-primary">{a.label}</span>
                  {a.isDefault && (
                    <span className="shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">Default</span>
                  )}
                </div>
                <div className="mt-2 text-sm text-text-secondary">
                  {a.companyName && <div>{a.companyName}</div>}
                  <div>{a.addressLine1}</div>
                  {a.addressLine2 && <div>{a.addressLine2}</div>}
                  <div>
                    {a.city}
                    {a.stateOrProvinceCode ? `, ${a.stateOrProvinceCode}` : ''} {a.postalCode}
                  </div>
                  <div>{countryName(a.countryCode)}</div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {a.name} · {a.phoneNumber}
                  {a.email ? ` · ${a.email}` : ''}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                <Button variant="outline" size="sm" onClick={() => openForm(a)}>
                  Edit
                </Button>
                {!a.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => act(() => makeDefault(a.id).unwrap(), `${a.label} is now the default`)}>
                    Make default
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setDeleting(a)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={saving ? () => {} : () => setEditing(null)}
        title={editing === 'new' ? 'Add address' : 'Edit address'}
        size="lg"
      >
        <AddressForm value={fields} onChange={setFields} showErrors={showErrors} withLabel />
        {editing === 'new' && (
          <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} />
            Use as the default ship-from address
          </label>
        )}
        {error && (
          <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.label ?? 'address'}?`} size="sm">
        <p className="text-sm text-text-muted">
          Shipments already created keep the address they were planned with. This only removes it from the address book.
        </p>
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const target = deleting!
              setDeleting(null)
              await act(() => remove(target.id).unwrap(), `${target.label} deleted`)
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
