"use client"

import { useCallback, useMemo, useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import {
  AllocationConflict,
  AllocationItemInput,
  AllocationSplit,
  ProductInventoryItem,
  PushResult,
  SaveAllocationResponse,
  useGetChannelTargetsQuery,
  usePreviewAllocationQuery,
  usePushStockMutation,
  useSaveAllocationMutation,
} from '@/services/api/inventoryPlanner.api'
import { AssignMode, SplitShares, assignByShares, assignRemaining, isSplitChanged, splitError, splitFromBalances } from './allocationMath'

export type AllocationStep = 'split' | 'channels' | 'review' | 'result'

interface DrawerState {
  step: AllocationStep
  /** The products being allocated: the planner selection, plus any added or minus any removed in the drawer. */
  items: ProductInventoryItem[]
  splits: Record<string, AllocationSplit>
  /** Per-item channel picks; an item with no entry uses every connected target. */
  channelPicks: Record<string, string[]>
  conflicts: AllocationConflict[]
  result: SaveAllocationResponse | null
}

const initialState = (items: ProductInventoryItem[]): DrawerState => ({
  step: 'split',
  items,
  splits: Object.fromEntries(items.map((item) => [item.id, splitFromBalances(item.balances)])),
  channelPicks: {},
  conflicts: [],
  result: null,
})

const samePush = (a: PushResult, b: PushResult) => a.inventoryItemId === b.inventoryItemId && a.channel === b.channel

/**
 * All state and actions of the allocation drawer. `initialItems` is a snapshot taken
 * when the drawer opens, so a background refetch never resets in-progress edits;
 * products added in the drawer are snapshots too.
 */
export function useAllocationDrawer(initialItems: ProductInventoryItem[]) {
  const dispatch = useAppDispatch()
  const [state, setState] = useState<DrawerState>(() => initialState(initialItems))
  const { items } = state
  const { data: targets = [], isLoading: targetsLoading } = useGetChannelTargetsQuery()
  const [saveAllocation, { isLoading: isSaving }] = useSaveAllocationMutation()
  const [pushStock, { isLoading: isRetrying }] = usePushStockMutation()

  const connectedIds = useMemo(() => targets.filter((t) => t.connected).map((t) => t.id), [targets])

  const channelsFor = useCallback(
    (itemId: string) => state.channelPicks[itemId] ?? connectedIds,
    [state.channelPicks, connectedIds]
  )

  const allocationInput: AllocationItemInput[] = useMemo(
    () =>
      items.map((item) => ({
        inventoryItemId: Number(item.id),
        ...state.splits[item.id],
        expected: item.balances,
      })),
    [items, state.splits]
  )

  // The review step shows exactly what the backend planner will record
  const preview = usePreviewAllocationQuery(allocationInput, { skip: state.step !== 'review' })

  const errors = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, splitError(item.balances, state.splits[item.id])] as const).filter(([, e]) => e)
      ) as Record<string, string>,
    [items, state.splits]
  )

  const listingCount = items.reduce((sum, item) => sum + channelsFor(item.id).length, 0)
  const changedCount = items.filter((item) => isSplitChanged(item.balances, state.splits[item.id])).length
  // Channels only receive FBM quantities, so with no FBM change there is nothing to push
  const hasFbmChange = items.some((item) => state.splits[item.id].fbm !== splitFromBalances(item.balances).fbm)

  // ── Products
  const addItem = useCallback((item: ProductInventoryItem) => {
    setState((prev) =>
      prev.items.some((i) => i.id === item.id)
        ? prev
        : { ...prev, items: [...prev.items, item], splits: { ...prev.splits, [item.id]: splitFromBalances(item.balances) } }
    )
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setState((prev) => {
      const splits = { ...prev.splits }
      const channelPicks = { ...prev.channelPicks }
      delete splits[itemId]
      delete channelPicks[itemId]
      return { ...prev, items: prev.items.filter((i) => i.id !== itemId), splits, channelPicks }
    })
  }, [])

  // ── Split step
  const setSplitField = useCallback((itemId: string, field: keyof AllocationSplit, value: number) => {
    setState((prev) => ({
      ...prev,
      splits: { ...prev.splits, [itemId]: { ...prev.splits[itemId], [field]: value } },
    }))
  }, [])

  const assign = useCallback(
    (itemId: string, mode: AssignMode) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      setState((prev) => ({
        ...prev,
        splits: { ...prev.splits, [itemId]: assignRemaining(item.balances, prev.splits[itemId], mode) },
      }))
    },
    [items]
  )

  /** The slider: divides the item's new units between FBA, WFS and FBM by percentage. */
  const assignShares = useCallback(
    (itemId: string, shares: SplitShares) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      setState((prev) => ({
        ...prev,
        splits: { ...prev.splits, [itemId]: assignByShares(item.balances, prev.splits[itemId], shares) },
      }))
    },
    [items]
  )

  // ── Channels step
  const toggleChannel = useCallback(
    (itemId: string, targetId: string) => {
      setState((prev) => {
        const current = prev.channelPicks[itemId] ?? connectedIds
        const next = current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId]
        return { ...prev, channelPicks: { ...prev.channelPicks, [itemId]: next } }
      })
    },
    [connectedIds]
  )

  const setColumn = useCallback(
    (targetId: string, selected: boolean) => {
      setState((prev) => ({
        ...prev,
        channelPicks: Object.fromEntries(
          items.map((item) => {
            const without = (prev.channelPicks[item.id] ?? connectedIds).filter((id) => id !== targetId)
            return [item.id, selected ? [...without, targetId] : without]
          })
        ),
      }))
    },
    [items, connectedIds]
  )

  const goTo = useCallback((step: AllocationStep) => setState((prev) => ({ ...prev, step })), [])

  // ── Save and push
  /** Saves the split and, unless `push` is false, pushes FBM to the picked channels. Resolves to whether it saved. */
  const save = useCallback(
    async ({ push = true }: { push?: boolean } = {}) => {
      try {
        const result = await saveAllocation(
          allocationInput.map((input, i) => ({ ...input, channels: push ? channelsFor(items[i].id) : [] }))
        ).unwrap()
        setState((prev) => ({ ...prev, step: 'result', result, conflicts: [] }))
        return true
      } catch (err: any) {
        setState((prev) => ({ ...prev, conflicts: err?.data?.conflicts ?? [] }))
        dispatch(addNotification({ message: err?.data?.error ?? 'Couldn’t save the allocation. Try again.', type: 'error' }))
        return false
      }
    },
    [allocationInput, channelsFor, items, saveAllocation, dispatch]
  )

  /** Re-pushes the given listings and swaps their results in place. */
  const retry = useCallback(
    async (pushes: PushResult[]) => {
      if (pushes.length === 0) return
      const byItem = new Map<number, string[]>()
      for (const p of pushes) byItem.set(p.inventoryItemId, [...(byItem.get(p.inventoryItemId) ?? []), p.channel])

      try {
        const { results } = await pushStock([...byItem].map(([inventoryItemId, channels]) => ({ inventoryItemId, channels }))).unwrap()
        setState((prev) =>
          prev.result
            ? {
                ...prev,
                result: {
                  ...prev.result,
                  pushResults: prev.result.pushResults.map((old) => results.find((r) => samePush(r, old)) ?? old),
                },
              }
            : prev
        )
      } catch (err: any) {
        dispatch(addNotification({ message: err?.data?.error ?? 'Retry failed. Try again.', type: 'error' }))
      }
    },
    [pushStock, dispatch]
  )

  const retryFailed = useCallback(
    () => retry(state.result?.pushResults.filter((r) => !r.success) ?? []),
    [retry, state.result]
  )

  return {
    state,
    items,
    targets,
    targetsLoading,
    preview,
    errors,
    hasErrors: Object.keys(errors).length > 0,
    listingCount,
    changedCount,
    hasFbmChange,
    isSaving,
    isRetrying,
    channelsFor,
    addItem,
    removeItem,
    setSplitField,
    assign,
    assignShares,
    toggleChannel,
    setColumn,
    goTo,
    save,
    retry,
    retryFailed,
  }
}

export type AllocationDrawerModel = ReturnType<typeof useAllocationDrawer>
