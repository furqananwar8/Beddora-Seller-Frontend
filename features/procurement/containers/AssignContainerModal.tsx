'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetAssignableContainersQuery, useSetContainerPackagingListMutation, type AssignableContainer, type PackagingListItem } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { DESTINATION_LABEL } from '../shared/poMeta'
import { ContainerFormModal } from './ContainerFormModal'

interface AssignContainerModalProps {
  /** The list to put into a container; closed when null. */
  list: PackagingListItem | null
  onClose: () => void
}

const describe = (container: AssignableContainer) =>
  [container.containerNo, DESTINATION_LABEL[container.destination], container.etd ? `ETD ${formatCalendarDay(container.etd)}` : null].filter(Boolean).join(' · ')

/**
 * "Assign container" on a packaging list: one empty container of the list's country, or a new one.
 * Moving a list that is already in a container takes it out of that one first.
 */
export const AssignContainerModal: React.FC<AssignContainerModalProps> = ({ list, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [picked, setPicked] = useState<AssignableContainer | null>(null)
  const [creating, setCreating] = useState(false)
  const [assign, { isLoading: assigning }] = useSetContainerPackagingListMutation()
  const current = list?.container ?? null

  const { data: containers = [], isFetching } = useGetAssignableContainersQuery({ destination: list?.destination ?? 'US', includeId: current?.id }, { skip: !list })

  useEffect(() => {
    setPicked(null)
  }, [list?.id])
  // The list's own container is preselected when changing it
  useEffect(() => {
    if (current && !picked) setPicked(containers.find((container) => container.id === current.id) ?? null)
  }, [containers, current, picked])

  const busy = assigning
  const unchanged = !picked || picked.id === current?.id

  const moveTo = async (target: { id: number; containerNo: string }) => {
    if (!list) return
    try {
      if (current && current.id !== target.id) await assign({ id: current.id, packagingListId: null }).unwrap()
      await assign({ id: target.id, packagingListId: list.id }).unwrap()
      success(`${list.plNo} is in ${target.containerNo}`)
      onClose()
    } catch (error) {
      failure(error, 'Could not assign the container')
    }
  }

  const save = () => picked && moveTo(picked)

  const takeOut = async () => {
    if (!list || !current) return
    try {
      await assign({ id: current.id, packagingListId: null }).unwrap()
      success(`${list.plNo} taken out of ${current.containerNo}`)
      onClose()
    } catch (error) {
      failure(error, 'Could not take the list out of the container')
    }
  }

  return (
    <>
      <Modal isOpen={list !== null && !creating} onClose={onClose} title={`${current ? 'Change container' : 'Assign container'} · ${list?.plNo ?? ''}`} size="md" closeOnEscape={!busy} className="sm:overflow-visible">
        {list && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              {list.supplier.name} · {list.purchaseOrders.map((po) => po.poNo).join(', ')} · {DESTINATION_LABEL[list.destination]} · {list.cbm.toFixed(2)} CBM
            </p>
            <FormField label="Container" htmlFor="assign-container" hint={`Only empty containers shipping to ${DESTINATION_LABEL[list.destination]}. One container carries one packaging list.`}>
              <SearchableSelect<AssignableContainer>
                id="assign-container"
                value={picked}
                onChange={setPicked}
                options={containers}
                getKey={(container) => container.id}
                getLabel={describe}
                renderOption={(container) => (
                  <span className="flex w-full justify-between gap-3">
                    <span className="font-mono text-sm font-semibold">{container.containerNo}</span>
                    <span className="text-xs text-text-muted">
                      {container.id === current?.id ? 'Current' : 'Empty'}
                      {container.etd ? ` · ETD ${formatCalendarDay(container.etd)}` : ''}
                      {container.billOfLading ? ` · ${container.billOfLading}` : ''}
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
                    className="w-full px-3 py-2 text-left text-sm font-medium text-primary-600 hover:bg-primary-50"
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {current && (
                <Button type="button" variant="outline" className="sm:mr-auto" onClick={() => void takeOut()} disabled={busy}>
                  Take out of {current.containerNo}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="sm:ml-auto">
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} isLoading={busy} disabled={unchanged}>
                Assign
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {list && (
        <ContainerFormModal
          isOpen={creating}
          onClose={() => setCreating(false)}
          preset={{ destination: list.destination, packagingList: current ? null : { id: list.id, plNo: list.plNo, supplierName: list.supplier.name, units: list.units, cbm: list.cbm } }}
          onSaved={(saved) => (current ? void moveTo(saved) : onClose())}
        />
      )}
    </>
  )
}
