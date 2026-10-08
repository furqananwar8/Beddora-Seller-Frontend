import type { NewCostCenter } from '@/services/api/costCenters.api'

/** A cost center the create screen can point at: one already saved, or one added on this screen and not yet sent. */
export type CostCenterRef = { kind: 'saved'; id: number; name: string } | { kind: 'pending'; key: string }

export interface DraftEntry {
  key: string
  name: string
  level: number
  /** What was selected on each level above when this entry was added; the last one is its parent. */
  ancestors: CostCenterRef[]
}

export interface DraftState {
  entries: DraftEntry[]
  /** Selection per level, index 0 being L1. A level's choices depend on the selection one level up. */
  selected: (CostCenterRef | null)[]
}

export type DraftAction =
  | { type: 'select'; level: number; ref: CostCenterRef | null }
  | { type: 'add'; level: number; key: string; name: string }
  | { type: 'rename'; key: string; name: string }
  | { type: 'remove'; key: string }
  | { type: 'reset' }

export const initialDraft: DraftState = { entries: [], selected: [] }

export const sameRef = (a: CostCenterRef | null, b: CostCenterRef | null): boolean =>
  a === b || (!!a && !!b && (a.kind === 'saved' ? b.kind === 'saved' && a.id === b.id : b.kind === 'pending' && a.key === b.key))

const refersTo = (key: string) => (ref: CostCenterRef | null) => ref?.kind === 'pending' && ref.key === key

/** New entries added anywhere under the given new entry. */
export const pendingDescendants = (state: DraftState, key: string): DraftEntry[] => state.entries.filter((entry) => entry.ancestors.some(refersTo(key)))

/** Selecting on a level keeps the levels above and clears the ones below, whose choices no longer apply. */
const selectAt = (selected: DraftState['selected'], level: number, ref: CostCenterRef | null) => [...selected.slice(0, level - 1), ref]

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: selectAt(state.selected, action.level, action.ref) }

    case 'add': {
      const ancestors = state.selected.slice(0, action.level - 1).filter((ref): ref is CostCenterRef => ref !== null)
      if (ancestors.length !== action.level - 1) return state
      const entry: DraftEntry = { key: action.key, name: action.name, level: action.level, ancestors }
      // The new entry becomes the selection, so the next level adds under it straight away
      return { entries: [...state.entries, entry], selected: selectAt(state.selected, action.level, { kind: 'pending', key: action.key }) }
    }

    case 'rename':
      return { ...state, entries: state.entries.map((entry) => (entry.key === action.key ? { ...entry, name: action.name } : entry)) }

    case 'remove': {
      // An entry takes everything added under it along
      const dropped = new Set([action.key, ...pendingDescendants(state, action.key).map((entry) => entry.key)])
      const entries = state.entries.filter((entry) => !dropped.has(entry.key))
      const cut = state.selected.findIndex((ref) => ref?.kind === 'pending' && !entries.some((entry) => entry.key === ref.key))
      return { entries, selected: cut === -1 ? state.selected : state.selected.slice(0, cut) }
    }

    case 'reset':
      return initialDraft
  }
}

/* ─────────────── selectors ─────────────── */

/** The parent new entries on a level go under: the selection one level up, or null for L1. */
export const parentAt = (state: DraftState, level: number): CostCenterRef | null => (level === 1 ? null : (state.selected[level - 2] ?? null))

/** Whether a level can take a new entry: L1 always, deeper levels once the level above has a selection. */
export const canAddAt = (state: DraftState, level: number): boolean => level === 1 || parentAt(state, level) !== null

/** New entries sitting directly under a parent (null: new L1s). */
export const pendingUnder = (state: DraftState, parent: CostCenterRef | null): DraftEntry[] =>
  state.entries.filter((entry) => sameRef(parentOf(entry), parent))

export const parentOf = (entry: DraftEntry): CostCenterRef | null => entry.ancestors[entry.ancestors.length - 1] ?? null

/** Lower-cased names of the new entries beside this one (saved siblings are checked by the server). */
export const pendingSiblingNames = (state: DraftState, entry: DraftEntry): Set<string> =>
  new Set(pendingUnder(state, parentOf(entry)).map((sibling) => sibling.name.toLowerCase()))

export const entriesAt = (state: DraftState, level: number): DraftEntry[] => state.entries.filter((entry) => entry.level === level)

export function nameOf(state: DraftState, ref: CostCenterRef): string {
  return ref.kind === 'saved' ? ref.name : (state.entries.find((entry) => entry.key === ref.key)?.name ?? '')
}

/** Where an entry sits, as names from L1 down to its parent. */
export const pathOf = (state: DraftState, entry: DraftEntry): string[] => entry.ancestors.map((ref) => nameOf(state, ref))

/** What the API takes: each new entry under its saved parent or under another new entry. */
export const toPayload = (state: DraftState): NewCostCenter[] =>
  state.entries.map((entry) => {
    const { key, name } = entry
    const parent = parentOf(entry)
    if (!parent) return { key, name }
    return parent.kind === 'saved' ? { key, name, parentId: parent.id } : { key, name, parentKey: parent.key }
  })
