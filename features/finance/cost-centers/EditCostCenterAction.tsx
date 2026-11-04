'use client'

import React, { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useRenameCostCenterMutation } from '@/services/api/costCenters.api'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { levelLabel } from './costCenterCode'
import { CostCenterNameDialog } from './create/CostCenterNameDialog'

interface EditCostCenterActionProps {
  node: { id: number; name: string; level: number }
  /** Lower-cased names of its siblings, when known; the server checks the name either way. */
  takenNames?: ReadonlySet<string>
}

const NO_NAMES: ReadonlySet<string> = new Set()

/**
 * Rename a cost center. The server refuses (and says where) when it or anything under it is still booked to by a
 * payment request, purchase invoice or container mapping; that comes back as the error toast.
 */
export const EditCostCenterAction: React.FC<EditCostCenterActionProps> = ({ node, takenNames = NO_NAMES }) => {
  const { canWriteCostCenters } = useFinanceCapabilities()
  const { success, failure } = useFinanceFeedback()
  const [rename] = useRenameCostCenterMutation()
  const [open, setOpen] = useState(false)
  if (!canWriteCostCenters) return null

  const save = async (name: string) => {
    setOpen(false)
    try {
      await rename({ id: node.id, name }).unwrap()
      success(`${node.name} renamed to ${name}`)
    } catch (error) {
      failure(error, `Could not edit ${node.name}`)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${node.name}`}
        title="Edit name"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <CostCenterNameDialog
        isOpen={open}
        title={`Edit ${levelLabel(node.level)} cost center`}
        initialName={node.name}
        submitLabel="Save"
        takenNames={takenNames}
        onSubmit={save}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
