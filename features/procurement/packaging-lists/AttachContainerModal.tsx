'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAddContainerPackagingListMutation, useGetContainersQuery, type ContainerItem, type PoDestination } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'
import { DESTINATION_LABEL, containerLabel } from '../shared/poMeta'

interface AttachContainerModalProps {
  /** The packaging list (tentative or final) to put in a container; closed when null. */
  list: { id: number; plNo: string; destination: PoDestination } | null
  onClose: () => void
}

/** Puts a packaging list in a booked container of its country; a tentative list's totals then follow it until it is final. */
export const AttachContainerModal: React.FC<AttachContainerModalProps> = ({ list, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [picked, setPicked] = useState<ContainerItem | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(search.trim(), 250)
  const [addList, { isLoading }] = useAddContainerPackagingListMutation()
  const { data, isFetching } = useGetContainersQuery({ page: 1, limit: 50, status: ['BOOKED'], destination: list ? [list.destination] : undefined, search: debounced }, { skip: !list || !open })

  useEffect(() => {
    setPicked(null)
    setSearch('')
  }, [list?.id])

  const attach = async () => {
    if (!list || !picked) return
    try {
      await addList({ id: picked.id, packagingListId: list.id }).unwrap()
      success(`${list.plNo} is in ${containerLabel(picked)}`)
      onClose()
    } catch (error) {
      failure(error, 'Could not add the packaging list to the container')
    }
  }

  return (
    <Modal isOpen={list !== null} onClose={onClose} title={`Add ${list?.plNo ?? ''} to a container`} size="md" closeOnEscape={!isLoading} className="sm:overflow-visible">
      {list && (
        <div className="flex flex-col gap-4">
          <FormField label="Container" htmlFor="attach-container" hint={`Booked containers shipping to ${DESTINATION_LABEL[list.destination]}. A tentative list keeps changing, and so do the container's totals, until the list is final.`}>
            <SearchableSelect<ContainerItem>
              id="attach-container"
              value={picked}
              onChange={setPicked}
              options={data?.data ?? []}
              getKey={(container) => container.id}
              getLabel={(container) => `${containerLabel(container)}${container.destinationCity ? ` · ${container.destinationCity}` : ''}`}
              renderOption={(container) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="font-mono text-sm font-semibold">{containerLabel(container)}</span>
                  <span className="truncate text-xs text-text-muted">
                    {container.destinationCity ?? 'No city yet'} · {container.packagingLists.length} {container.packagingLists.length === 1 ? 'list' : 'lists'}
                  </span>
                </span>
              )}
              search={search}
              onSearchChange={setSearch}
              onOpenChange={setOpen}
              loading={isFetching}
              placeholder="Select a booked container"
              searchPlaceholder="Container number"
              emptyText="No booked container for this country."
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void attach()} isLoading={isLoading} disabled={!picked}>
              Add to container
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
