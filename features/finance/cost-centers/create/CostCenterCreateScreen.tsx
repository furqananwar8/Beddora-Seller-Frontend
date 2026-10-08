'use client'

import React, { useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Button } from '@/design-system/buttons'
import { useCreateCostCentersMutation } from '@/services/api/costCenters.api'
import { useFinanceFeedback } from '../../shared/useFinanceFeedback'
import { COST_CENTER_BASE } from '../CostCenterListScreen'
import { LEVELS, levelLabel } from '../costCenterCode'
import { CostCenterNameDialog } from './CostCenterNameDialog'
import { type DraftEntry, draftReducer, initialDraft, nameOf, pathOf, pendingDescendants, toPayload } from './costCenterDraft'
import { LevelRow } from './LevelRow'

/** What the name dialog is doing: adding on a level, or renaming a new entry. */
type NameTarget = { mode: 'add'; level: number; takenNames: Set<string> } | { mode: 'edit'; entry: DraftEntry; takenNames: Set<string> }

/**
 * Builds a cost center hierarchy L1 → L4. Each level picks a saved cost center or adds new ones under the
 * selection above; new entries stay on this screen (editable, removable) until Submit saves them all at once.
 */
export const CostCenterCreateScreen: React.FC = () => {
  const router = useRouter()
  const { success, failure } = useFinanceFeedback()
  const [state, dispatch] = useReducer(draftReducer, initialDraft)
  const [naming, setNaming] = useState<NameTarget | null>(null)
  const [removing, setRemoving] = useState<DraftEntry | null>(null)
  const [create, { isLoading: saving }] = useCreateCostCentersMutation()

  /** Where the named entry sits, e.g. "L3 under Expense › Trucking Cost". */
  const placement = (level: number, path: string[]) => (path.length ? `${levelLabel(level)} under ${path.join(' › ')}` : 'An L1 cost center')
  const addPath = (level: number) => state.selected.slice(0, level - 1).flatMap((ref) => (ref ? [nameOf(state, ref)] : []))

  const submitName = (name: string) => {
    if (!naming) return
    if (naming.mode === 'add') dispatch({ type: 'add', level: naming.level, key: crypto.randomUUID(), name })
    else dispatch({ type: 'rename', key: naming.entry.key, name })
    setNaming(null)
  }

  const submit = async () => {
    try {
      const created = await create(toPayload(state)).unwrap()
      success(`${created.length} cost center${created.length === 1 ? '' : 's'} saved`)
      dispatch({ type: 'reset' })
      router.push(COST_CENTER_BASE)
    } catch (error) {
      failure(error, 'Could not save the cost centers')
    }
  }

  const removingUnder = removing ? pendingDescendants(state, removing.key).length : 0

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text-primary sm:text-xl">Create cost center & hierarchy</h1>
        <Button variant="outline" onClick={() => router.push(COST_CENTER_BASE)}>
          Back to cost centers
        </Button>
      </div>

      <div className="max-w-4xl rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <p className="mb-2 text-sm text-text-muted">
          Select or add an L1, then the levels below open up. Each new entry is added under the selection on the level above it.
        </p>

        {LEVELS.map((level) => (
          <LevelRow
            key={level}
            level={level}
            state={state}
            onSelect={(option) => dispatch({ type: 'select', level, ref: option.ref })}
            onAdd={(takenNames) => setNaming({ mode: 'add', level, takenNames })}
            onEdit={(entry, takenNames) => setNaming({ mode: 'edit', entry, takenNames })}
            onRemove={setRemoving}
          />
        ))}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">{state.entries.length ? `${state.entries.length} new, not saved yet` : 'Nothing new to save'}</span>
          <Button onClick={submit} disabled={state.entries.length === 0} isLoading={saving}>
            Submit
          </Button>
        </div>
      </div>

      <CostCenterNameDialog
        isOpen={naming !== null}
        title={naming?.mode === 'edit' ? `Edit ${levelLabel(naming.entry.level)}` : `Add ${levelLabel(naming?.level ?? 1)}`}
        context={naming?.mode === 'edit' ? placement(naming.entry.level, pathOf(state, naming.entry)) : naming ? placement(naming.level, addPath(naming.level)) : undefined}
        initialName={naming?.mode === 'edit' ? naming.entry.name : ''}
        submitLabel={naming?.mode === 'edit' ? 'Save' : 'Add'}
        takenNames={naming?.takenNames ?? new Set()}
        onSubmit={submitName}
        onClose={() => setNaming(null)}
      />

      <ConfirmDialog
        isOpen={removing !== null}
        title={`Remove ${removing?.name ?? 'entry'}`}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (removing) dispatch({ type: 'remove', key: removing.key })
          setRemoving(null)
        }}
        onClose={() => setRemoving(null)}
      >
        <p>
          It has not been saved yet, so it is simply dropped
          {removingUnder > 0 ? `, along with the ${removingUnder} new entr${removingUnder === 1 ? 'y' : 'ies'} added under it` : ''}.
        </p>
      </ConfirmDialog>
    </Container>
  )
}
