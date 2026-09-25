"use client"

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { AssignMode, assignRemaining, isSplitChanged, splitError, splitFromBalances } from './allocationMath'

export type AllocationStep = 'split' | 'channels' | 'review' | 'result'

interface DrawerState {
  step: AllocationStep
  splits: Record<string, AllocationSplit>
  /** Per-item channel picks; an item with no entry uses every connected target. */
  channelPicks: Record<string, string[]>
  conflicts: AllocationConflict[]
  result: SaveAllocationResponse | null
}

const initialState = (items: ProductInventoryItem[]): DrawerState => ({
  step: 'split',
  splits: Object.fromEntries(items.map((item) => [item.id, splitFromBalances(item.balances)])),
  channelPicks: {},
  conflicts: [],
  result: null,
})

const samePush = (a: PushResult, b: PushResult) => a.inventoryItemId === b.inventoryItemId && a.channel === b.channel

/**
 * All state and actions of the allocation drawer. `items` is a snapshot taken
 * when the drawer opens, so a background refetch never resets in-progress edits.
 */
export function useAllocationDrawer(items: ProductInventoryItem[]) {
  const [state, setState] = useState<DrawerState>(() => initialState(items))
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
  const save = useCallback(async () => {
    try {
      const result = await saveAllocation(
        allocationInput.map((input, i) => ({ ...input, channels: channelsFor(items[i].id) }))
      ).unwrap()
      setState((prev) => ({ ...prev, step: 'result', result, conflicts: [] }))
    } catch (err: any) {
      setState((prev) => ({ ...prev, conflicts: err?.data?.conflicts ?? [] }))
      toast.error(err?.data?.error ?? 'Couldn’t save the allocation. Try again.')
    }
  }, [allocationInput, channelsFor, items, saveAllocation])

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
        toast.error(err?.data?.error ?? 'Retry failed. Try again.')
      }
    },
    [pushStock]
  )

  const retryFailed = useCallback(
    () => retry(state.result?.pushResults.filter((r) => !r.success) ?? []),
    [retry, state.result]
  )

  return {
    state,
    targets,
    targetsLoading,
    preview,
    errors,
    hasErrors: Object.keys(errors).length > 0,
    listingCount,
    changedCount,
    isSaving,
    isRetrying,
    channelsFor,
    setSplitField,
    assign,
    toggleChannel,
    setColumn,
    goTo,
    save,
    retry,
    retryFailed,
  }
}

export type AllocationDrawerModel = ReturnType<typeof useAllocationDrawer>
