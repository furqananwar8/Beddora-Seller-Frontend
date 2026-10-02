import { useCallback, useMemo, useState } from 'react'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Filters that are staged, then applied: changing a box only edits the draft, and the list
 * reloads once on `apply`. `reset` clears every box back to its default and reloads.
 */
export function useStagedFilters<T extends Record<string, unknown>>(defaults: T, onApply?: (applied: T) => void) {
  const [draft, setDraftState] = useState<T>(defaults)
  const [applied, setApplied] = useState<T>(defaults)

  const setDraft = useCallback(<K extends keyof T>(key: K, value: T[K]) => setDraftState((current) => ({ ...current, [key]: value })), [])

  /** Keys whose draft differs from what the list currently shows (they get the "changed" border). */
  const changed = useMemo(() => new Set((Object.keys(draft) as Array<keyof T>).filter((key) => !same(draft[key], applied[key]))), [draft, applied])

  /** Boxes set away from their default in the draft (enables Reset). */
  const activeCount = useMemo(() => (Object.keys(draft) as Array<keyof T>).filter((key) => !same(draft[key], defaults[key])).length, [draft, defaults])

  /** Filters actually narrowing the list right now. */
  const appliedCount = useMemo(() => (Object.keys(applied) as Array<keyof T>).filter((key) => !same(applied[key], defaults[key])).length, [applied, defaults])

  const apply = useCallback(() => {
    setApplied(draft)
    onApply?.(draft)
  }, [draft, onApply])

  const reset = useCallback(() => {
    setDraftState(defaults)
    setApplied(defaults)
    onApply?.(defaults)
  }, [defaults, onApply])

  return { draft, applied, setDraft, apply, reset, changed, pending: changed.size > 0, activeCount, appliedCount }
}
