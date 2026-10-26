'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import type { RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useMarkContainerDeliveredMutation, type ContainerItem } from '@/services/api/procurement.api'
import { downloadApiFile } from '@/utils/downloadFile'
import { containerLabel } from '../shared/poMeta'
import { PackagingListsModal } from './PackagingListsModal'
import { ContainerFormModal } from './ContainerFormModal'
import { CONTAINER_ROUTES } from './routes'

export const containerHref = CONTAINER_ROUTES.detail

/**
 * What can be done to a container, for its row menu and its own page alike: what each action needs (permission and
 * status) lives here once. Render `dialogs` once on the screen.
 */
export function useContainerActions() {
  const router = useRouter()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'containers:containers')
  const canAssign = canWrite || ability.can('write', 'procurement:packaging-lists')
  const { success, failure } = useApiFeedback()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ContainerItem | null>(null)
  const [changingList, setChangingList] = useState<ContainerItem | null>(null)
  const [delivering, setDelivering] = useState<ContainerItem | null>(null)
  const [markDelivered, { isLoading: deliveringBusy }] = useMarkContainerDeliveredMutation()

  const confirmDelivered = async () => {
    if (!delivering) return
    try {
      await markDelivered(delivering.id).unwrap()
      success(`${containerLabel(delivering)} delivered`)
      setDelivering(null)
    } catch (error) {
      failure(error, 'Could not mark the container delivered')
    }
  }

  const downloadList = async (list: { id: number; plNo: string }) => {
    try {
      await downloadApiFile(`/procurement/packaging-lists/${list.id}/pdf`, `${list.plNo.replace('#', '')}.pdf`)
    } catch (error) {
      failure(error, 'Could not download the PDF')
    }
  }

  const actionsFor = (container: ContainerItem, { onPage = false } = {}): RowActionItem[] => {
    const { permissions } = container
    const lists = container.packagingLists
    const delivered = container.status === 'DELIVERED'
    return [
      ...(onPage ? [] : [{ key: 'view', label: 'View container', onSelect: () => router.push(containerHref(container.id)) }]),
      ...(canWrite ? [{ key: 'edit', label: 'Edit container', onSelect: () => setEditing(container), disabled: delivered, disabledReason: 'Delivered containers cannot change' }] : []),
      ...(canAssign
        ? [
            {
              key: 'list',
              label: lists.length ? `Packaging lists (${lists.length})` : 'Add packaging list',
              onSelect: () => setChangingList(container),
              disabled: !permissions.canChangeList,
              disabledReason: 'Lists can be added or removed only while the container is booked',
            },
          ]
        : []),
      ...(lists.length
        ? lists.map((list) => ({ key: `pdf-${list.id}`, label: lists.length > 1 ? `Download ${list.plNo} PDF` : 'Download packaging list PDF', onSelect: () => void downloadList(list) }))
        : [{ key: 'pdf', label: 'Download packaging list PDF', onSelect: () => undefined, disabled: true, disabledReason: 'No packaging list yet' }]),
      ...(canWrite && !delivered ? [{ key: 'delivered', label: 'Mark delivered', onSelect: () => setDelivering(container) }] : []),
    ]
  }

  const dialogs = (
    <>
      <ContainerFormModal isOpen={creating || editing !== null} container={editing} onClose={() => (setCreating(false), setEditing(null))} />
      <PackagingListsModal container={changingList} onClose={() => setChangingList(null)} />
      <ConfirmDialog
        isOpen={delivering !== null}
        title={`Mark ${delivering ? containerLabel(delivering) : 'container'} delivered`}
        confirmLabel="Mark delivered"
        busy={deliveringBusy}
        onConfirm={confirmDelivered}
        onClose={() => setDelivering(null)}
      >
        <p>Once delivered, its details and packaging list can no longer change. Documents can still be added.</p>
      </ConfirmDialog>
    </>
  )

  return { canWrite, canAssign, actionsFor, startCreate: () => setCreating(true), changeList: setChangingList, edit: setEditing, dialogs }
}
