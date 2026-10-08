import { useMemo } from 'react'
import { useGetCostCenterOptionsQuery } from '@/services/api/costCenters.api'
import { type CostCenterRef, type DraftState, parentAt, pendingUnder } from './costCenterDraft'

export interface LevelOption {
  ref: CostCenterRef
  name: string
  /** Null until saved; the server numbers it on submit. */
  code: string | null
}

/**
 * The choices on one level: saved cost centers under the selection one level up plus the ones added on this screen.
 * Under a parent that is itself unsaved there can only be unsaved children, so nothing is fetched.
 */
export function useLevelOptions(state: DraftState, level: number) {
  const parent = parentAt(state, level)
  const savedParentId = parent?.kind === 'saved' ? parent.id : undefined
  const skip = level > 1 && savedParentId === undefined

  const { data: saved = [], isFetching } = useGetCostCenterOptionsQuery(savedParentId, { skip })

  const options = useMemo<LevelOption[]>(
    () => [
      ...(skip ? [] : saved).map((node) => ({ ref: { kind: 'saved' as const, id: node.id, name: node.name }, name: node.name, code: node.code })),
      ...pendingUnder(state, parent).map((entry) => ({ ref: { kind: 'pending' as const, key: entry.key }, name: entry.name, code: null })),
    ],
    [saved, skip, state, parent]
  )

  const takenNames = useMemo(() => new Set(options.map((option) => option.name.toLowerCase())), [options])

  return { options, takenNames, loading: isFetching }
}
