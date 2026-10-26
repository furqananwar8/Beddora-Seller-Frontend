'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  useAddContainerPackagingListMutation,
  useGetContainerQuery,
  useGetPackagingListsQuery,
  useRemoveContainerPackagingListMutation,
  type ContainerItem,
} from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'
import { DESTINATION_LABEL, containerLabel, supplierNames } from '../shared/poMeta'

/** A packaging list as the picker shows it. */
interface ListChoice {
  id: number
  plNo: string
  supplierName: string
  units: number
  cbm: number
}

interface PackagingListsModalProps {
  /** The container whose lists change; closed when null. */
  container: ContainerItem | null
  onClose: () => void
}

/**
 * "Packaging lists" of a booked container: it keeps taking lists of its country (each list in one container only)
 * until it ships, and any of them can be taken out again while it is booked.
 */
export const PackagingListsModal: React.FC<PackagingListsModalProps> = ({ container: opened, onClose }) => {
  // Read live while open: every add or remove refreshes it, so the lists shown are always the saved ones
  const { data: live } = useGetContainerQuery(opened?.id ?? 0, { skip: !opened })
  const container = opened && live?.id === opened.id ? live : opened
  const { success, failure } = useApiFeedback()
  const [picked, setPicked] = useState<ListChoice | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const debounced = useDebounce(search.trim(), 250)
  const [addList, { isLoading: adding }] = useAddContainerPackagingListMutation()
  const [removeList] = useRemoveContainerPackagingListMutation()
  const lists = container?.packagingLists ?? []

  const { data, isFetching } = useGetPackagingListsQuery(
    { page: 1, limit: 50, container: 'NONE', destination: container?.destination, search: debounced },
    { skip: !container || !open }
  )
  const choices: ListChoice[] = (data?.data ?? []).map((list) => ({ id: list.id, plNo: list.plNo, supplierName: supplierNames(list.suppliers), units: list.units, cbm: list.cbm }))

  useEffect(() => {
    setPicked(null)
    setSearch('')
  }, [container?.id])

  const add = async () => {
    if (!container || !picked) return
    try {
      await addList({ id: container.id, packagingListId: picked.id }).unwrap()
      success(`${picked.plNo} is in ${containerLabel(container)}`)
      setPicked(null)
    } catch (error) {
      failure(error, 'Could not add the packaging list')
    }
  }

  const remove = async (list: { id: number; plNo: string }) => {
    if (!container) return
    setRemovingId(list.id)
    try {
      await removeList({ id: container.id, packagingListId: list.id }).unwrap()
      success(`${list.plNo} taken out of ${containerLabel(container)}`)
    } catch (error) {
      failure(error, `Could not take ${list.plNo} out`)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Modal isOpen={container !== null} onClose={onClose} title={`Packaging lists · ${container ? containerLabel(container) : ''}`} size="md" closeOnEscape={!adding} className="sm:overflow-visible">
      {container && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            {DESTINATION_LABEL[container.destination]} · {lists.length === 0 ? 'empty' : `${lists.length} list${lists.length === 1 ? '' : 's'}`}
          </p>

          {lists.length > 0 && (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {lists.map((list) => (
                <li key={list.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-mono text-sm font-semibold text-text-primary">{list.plNo}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {supplierNames(list.suppliers)} · {list.units.toLocaleString('en-CA')} units · {list.cbm.toFixed(2)} CBM
                    </span>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void remove(list)} isLoading={removingId === list.id} disabled={removingId !== null || adding}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <FormField label="Add a packaging list" htmlFor="add-list" hint={`Only lists shipping to ${DESTINATION_LABEL[container.destination]} that are not in a container. Totals add up across the lists.`}>
            <SearchableSelect<ListChoice>
              id="add-list"
              value={picked}
              onChange={setPicked}
              options={choices}
              getKey={(choice) => choice.id}
              getLabel={(choice) => `${choice.plNo} · ${choice.supplierName}`}
              renderOption={(choice) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="font-mono text-sm font-semibold">{choice.plNo}</span>
                  <span className="truncate text-xs text-text-muted">
                    {choice.supplierName} · {choice.units.toLocaleString('en-CA')} units · {choice.cbm.toFixed(2)} CBM
                  </span>
                </span>
              )}
              search={search}
              onSearchChange={setSearch}
              onOpenChange={setOpen}
              loading={isFetching}
              placeholder="Select an unassigned packaging list"
              searchPlaceholder="PL #, supplier, PO # or SKU"
              emptyText="No packaging list is waiting for a container."
            />
          </FormField>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={adding}>
              Close
            </Button>
            <Button type="button" onClick={() => void add()} isLoading={adding} disabled={!picked}>
              Add list
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
