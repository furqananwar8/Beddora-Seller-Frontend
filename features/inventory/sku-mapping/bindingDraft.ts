import type { BindingChange, BindingComponent, ChannelSku, InternalSku, TimelineAction } from '@/services/api/skuMapping.api'

/**
 * Unsaved edits on the graph. Server rows stay the source of truth; the draft only holds the listings whose
 * components differ from it, so "discard" is dropping the draft and "dirty" is a non-empty draft.
 */
export interface DraftState {
  /** Edited components per listing key; a key equal to the server copy is removed. */
  overrides: Record<string, BindingComponent[]>
  /** Internal SKUs put on the graph without a binding yet. */
  placed: InternalSku[]
  selected: string | null
}

export type DraftAction =
  | { type: 'select'; key: string | null }
  | { type: 'bind'; row: ChannelSku; internal: Pick<BindingComponent, 'productId' | 'sku' | 'name' | 'onHand'> }
  | { type: 'quantity'; row: ChannelSku; productId: number; quantity: number }
  | { type: 'unbind'; row: ChannelSku; productId: number }
  | { type: 'place'; internal: InternalSku }
  | { type: 'remove'; keys: string[] }
  /** After a save or discard: edits go, the selection stays. */
  | { type: 'clearEdits' }
  | { type: 'reset' }

export const EMPTY_DRAFT: DraftState = { overrides: {}, placed: [], selected: null }

const sameComponents = (a: BindingComponent[], b: BindingComponent[]) =>
  a.length === b.length && a.every((component) => b.some((other) => other.productId === component.productId && other.quantity === component.quantity))

export const componentsOf = (state: DraftState, row: ChannelSku): BindingComponent[] => state.overrides[row.key] ?? row.components

/** Stores `next` for the row, or forgets the override when it matches what the server has. */
function withComponents(state: DraftState, row: ChannelSku, next: BindingComponent[]): DraftState {
  const { [row.key]: _previous, ...rest } = state.overrides
  return { ...state, overrides: sameComponents(next, row.components) ? rest : { ...rest, [row.key]: next } }
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.key }
    case 'bind': {
      const current = componentsOf(state, action.row)
      if (current.some((component) => component.productId === action.internal.productId)) return { ...state, selected: action.row.key }
      const next = withComponents(state, action.row, [...current, { ...action.internal, quantity: 1 }])
      return { ...next, selected: action.row.key, placed: state.placed.filter((item) => item.productId !== action.internal.productId) }
    }
    case 'quantity': {
      const current = componentsOf(state, action.row)
      return withComponents(state, action.row, current.map((component) => (component.productId === action.productId ? { ...component, quantity: action.quantity } : component)))
    }
    case 'unbind':
      return withComponents(state, action.row, componentsOf(state, action.row).filter((component) => component.productId !== action.productId))
    case 'place':
      return state.placed.some((item) => item.productId === action.internal.productId) ? state : { ...state, placed: [...state.placed, action.internal] }
    case 'remove': {
      const removed = new Set(action.keys)
      const overrides = Object.fromEntries(Object.entries(state.overrides).filter(([key]) => !removed.has(key)))
      return { ...state, overrides, selected: state.selected && removed.has(state.selected) ? null : state.selected }
    }
    case 'clearEdits':
      return { ...EMPTY_DRAFT, selected: state.selected }
    case 'reset':
      return EMPTY_DRAFT
  }
}

export interface PendingChange {
  key: string
  channelSku: string
  marketplace: string
  action: TimelineAction
  internalSku: string
  from: number | null
  to: number | null
}

/** One entry per internal SKU that was bound, unbound or had its quantity changed. */
export function diffComponents(row: ChannelSku, next: BindingComponent[]): PendingChange[] {
  const base = { key: row.key, channelSku: row.sku, marketplace: row.marketplace }
  const before = new Map(row.components.map((component) => [component.productId, component]))
  const after = new Set(next.map((component) => component.productId))
  const changes: PendingChange[] = []
  for (const component of next) {
    const old = before.get(component.productId)
    if (!old) changes.push({ ...base, action: 'bound', internalSku: component.sku, from: null, to: component.quantity })
    else if (old.quantity !== component.quantity) changes.push({ ...base, action: 'quantity', internalSku: component.sku, from: old.quantity, to: component.quantity })
  }
  for (const component of row.components) {
    if (!after.has(component.productId)) changes.push({ ...base, action: 'unbound', internalSku: component.sku, from: component.quantity, to: null })
  }
  return changes
}

export function pendingChanges(state: DraftState, rows: ChannelSku[]): PendingChange[] {
  return rows.flatMap((row) => (state.overrides[row.key] ? diffComponents(row, state.overrides[row.key]) : []))
}

export function toBindingChanges(state: DraftState, rows: ChannelSku[]): BindingChange[] {
  return rows
    .filter((row) => state.overrides[row.key])
    .map((row) => ({
      marketplace: row.marketplace,
      channelSku: row.sku,
      components: state.overrides[row.key].map(({ productId, quantity }) => ({ productId, quantity })),
    }))
}
