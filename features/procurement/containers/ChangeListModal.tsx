'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetPackagingListsQuery, useSetContainerPackagingListMutation, type ContainerItem } from '@/services/api/procurement.api'
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

interface ChangeListModalProps {
  /** The container whose list changes; closed when null. */
  container: ContainerItem | null
  onClose: () => void
}

/** "Assign packaging list" / "Change packaging list" on a booked container: one list of its country that is in no container, or none. */
export const ChangeListModal: React.FC<ChangeListModalProps> = ({ container, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [picked, setPicked] = useState<ListChoice | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(search.trim(), 250)
  const [setList, { isLoading: busy }] = useSetContainerPackagingListMutation()
  const current = container?.packagingList ?? null

  const { data, isFetching } = useGetPackagingListsQuery(
    { page: 1, limit: 50, container: 'NONE', destination: container?.destination, search: debounced },
    { skip: !container || !open }
  )
  const choices: ListChoice[] = (data?.data ?? []).map((list) => ({ id: list.id, plNo: list.plNo, supplierName: supplierNames(list.suppliers), units: list.units, cbm: list.cbm }))

  useEffect(() => {
    setPicked(null)
    setSearch('')
  }, [container?.id])

  const change = async (packagingListId: number | null) => {
    if (!container) return
    try {
      await setList({ id: container.id, packagingListId }).unwrap()
      success(packagingListId ? `${picked?.plNo} is in ${containerLabel(container)}` : `${containerLabel(container)} is empty now`)
      onClose()
    } catch (error) {
      failure(error, 'Could not change the packaging list')
    }
  }

  return (
    <Modal isOpen={container !== null} onClose={onClose} title={`${current ? 'Change packaging list' : 'Assign packaging list'} · ${container ? containerLabel(container) : ''}`} size="md" closeOnEscape={!busy} className="sm:overflow-visible">
      {container && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            {DESTINATION_LABEL[container.destination]}
            {current ? ` · now carries ${current.plNo} (${supplierNames(current.suppliers)})` : ' · empty'}
          </p>
          <FormField label="Packaging list" htmlFor="change-list" hint={`Only lists shipping to ${DESTINATION_LABEL[container.destination]} that are not in a container. Totals follow the list.`}>
            <SearchableSelect<ListChoice>
              id="change-list"
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
              placeholder="Select one unassigned packaging list"
              searchPlaceholder="PL #, supplier, PO # or SKU"
              emptyText="No packaging list is waiting for a container."
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {current && (
              <Button type="button" variant="outline" className="sm:mr-auto" onClick={() => void change(null)} disabled={busy}>
                Take {current.plNo} out
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="sm:ml-auto">
              Cancel
            </Button>
            <Button type="button" onClick={() => picked && void change(picked.id)} isLoading={busy} disabled={!picked}>
              {current ? 'Change list' : 'Assign'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
