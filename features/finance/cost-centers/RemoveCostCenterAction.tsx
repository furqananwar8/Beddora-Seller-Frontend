'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { useDeleteCostCenterMutation } from '@/services/api/costCenters.api'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { levelLabel } from './costCenterCode'

interface RemoveCostCenterActionProps {
  node: { id: number; name: string; level: number }
  /** Whether it has cost centers under it (they go with it). */
  hasChildren: boolean
}

/**
 * Remove a cost center at any level, with everything under it. The server refuses (and says where) when it or
 * anything under it is still booked to by a payment request, purchase invoice or container mapping.
 */
export const RemoveCostCenterAction: React.FC<RemoveCostCenterActionProps> = ({ node, hasChildren }) => {
  const { canWriteCostCenters } = useFinanceCapabilities()
  const { success, failure } = useFinanceFeedback()
  const [remove, { isLoading }] = useDeleteCostCenterMutation()
  const [open, setOpen] = useState(false)
  if (!canWriteCostCenters) return null

  const confirm = async () => {
    try {
      await remove(node.id).unwrap()
      success(`${node.name} removed`)
      setOpen(false)
    } catch (error) {
      failure(error, `Could not remove ${node.name}`)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Remove ${node.name}`}
        title="Remove"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      <ConfirmDialog isOpen={open} title={`Remove ${levelLabel(node.level)} cost center`} confirmLabel="Remove" tone="danger" busy={isLoading} onConfirm={confirm} onClose={() => setOpen(false)}>
        Remove <strong>{node.name}</strong>
        {hasChildren ? ' and every cost center under it' : ''}? This is only allowed when none of them is used by a payment request, purchase invoice or container
        mapping.
      </ConfirmDialog>
    </>
  )
}
