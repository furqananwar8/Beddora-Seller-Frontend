'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetAssignableContainersQuery, useSetContainerPackagingListMutation, type AssignableContainer, type PackagingListItem } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { DESTINATION_LABEL, containerLabel, supplierNames } from '../shared/poMeta'
import { ContainerFormModal } from './ContainerFormModal'

interface AssignContainerModalProps {
  /** The list to put into a container (one that is in none yet); closed when null. */
  list: PackagingListItem | null
  onClose: () => void
}

const describe = (container: AssignableContainer) =>
  [containerLabel(container), DESTINATION_LABEL[container.destination], container.etd ? `ETD ${formatCalendarDay(container.etd)}` : null].filter(Boolean).join(' · ')

/** "Assign container" on a packaging list: an empty booked container of the list's country, or a new one. */
export const AssignContainerModal: React.FC<AssignContainerModalProps> = ({ list, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [picked, setPicked] = useState<AssignableContainer | null>(null)
  const [creating, setCreating] = useState(false)
  const [assign, { isLoading: assigning }] = useSetContainerPackagingListMutation()

  const { data: containers = [], isFetching } = useGetAssignableContainersQuery({ destination: list?.destination ?? 'US' }, { skip: !list })

  useEffect(() => {
    setPicked(null)
  }, [list?.id])

  const assignTo = async (target: { id: number; containerNo: string; containerNumber: string | null }) => {
    if (!list) return
    try {
      await assign({ id: target.id, packagingListId: list.id }).unwrap()
      success(`${list.plNo} is in ${containerLabel(target)}`)
      onClose()
    } catch (error) {
      failure(error, 'Could not assign the container')
    }
  }

  return (
    <>
      <Modal isOpen={list !== null && !creating} onClose={onClose} title={`Assign container · ${list?.plNo ?? ''}`} size="md" closeOnEscape={!assigning} className="sm:overflow-visible">
        {list && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              {supplierNames(list.suppliers)} · {list.purchaseOrders.map((po) => po.poNo).join(', ')} · {DESTINATION_LABEL[list.destination]} · {list.cbm.toFixed(2)} CBM
            </p>
            <FormField label="Container" htmlFor="assign-container" hint={`Empty booked containers shipping to ${DESTINATION_LABEL[list.destination]}. One container carries one packaging list.`}>
              <SearchableSelect<AssignableContainer>
                id="assign-container"
                value={picked}
                onChange={setPicked}
                options={containers}
                getKey={(container) => container.id}
                getLabel={describe}
                renderOption={(container) => (
                  <span className="flex w-full justify-between gap-3">
                    <span className="font-mono text-sm font-semibold">{containerLabel(container)}</span>
                    <span className="text-xs text-text-muted">
                      {container.containerNumber ? `${container.containerNo} · ` : ''}Empty
                      {container.etd ? ` · ETD ${formatCalendarDay(container.etd)}` : ''}
                    </span>
                  </span>
                )}
                loading={isFetching}
                placeholder="Select a container"
                searchPlaceholder="Search containers..."
                emptyText="No empty container for this country. Create one below."
                footer={(close) => (
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary-600 hover:bg-primary-600 hover:text-white"
                    onClick={() => {
                      close()
                      setCreating(true)
                    }}
                  >
                    + Create new container
                  </button>
                )}
              />
            </FormField>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={assigning}>
                Cancel
              </Button>
              <Button type="button" onClick={() => picked && void assignTo(picked)} isLoading={assigning} disabled={!picked}>
                Assign
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* A container created from here gets the list straight away */}
      {list && <ContainerFormModal isOpen={creating} onClose={() => setCreating(false)} preset={{ destination: list.destination }} onSaved={(saved) => void assignTo(saved)} />}
    </>
  )
}
