'use client'

import React, { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useMoveCostCenterMutation, useRenameCostCenterMutation } from '@/services/api/costCenters.api'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { EditCostCenterDialog, type EditCostCenterValues } from './EditCostCenterDialog'

interface EditCostCenterActionProps {
  node: { id: number; name: string; level: number }
  /** Lower-cased names of its siblings, when known; the server checks the name either way. */
  takenNames?: ReadonlySet<string>
}

const NO_NAMES: ReadonlySet<string> = new Set()

/**
 * Rename a cost center and/or move it under another head. The server refuses (and says where) a rename while it or
 * anything under it is booked to by a payment request, purchase invoice or container mapping, and a move to another
 * level for the same reason; that comes back as the error toast.
 */
export const EditCostCenterAction: React.FC<EditCostCenterActionProps> = ({ node, takenNames = NO_NAMES }) => {
  const { canWriteCostCenters } = useFinanceCapabilities()
  const { success, failure } = useFinanceFeedback()
  const [rename] = useRenameCostCenterMutation()
  const [move] = useMoveCostCenterMutation()
  const [open, setOpen] = useState(false)
  if (!canWriteCostCenters) return null

  const save = async ({ name, parentId }: EditCostCenterValues) => {
    setOpen(false)
    try {
      if (name !== node.name) {
        await rename({ id: node.id, name }).unwrap()
        success(`${node.name} renamed to ${name}`)
      }
      if (parentId !== null) {
        await move({ id: node.id, parentId }).unwrap()
        success(`${name} moved`)
      }
    } catch (error) {
      failure(error, `Could not edit ${node.name}`)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${node.name}`}
        title="Edit"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <EditCostCenterDialog isOpen={open} node={node} takenNames={takenNames} onSubmit={save} onClose={() => setOpen(false)} />
    </>
  )
}
