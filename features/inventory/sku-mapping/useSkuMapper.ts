'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { draftActed, filtersApplied, graphKeysSet } from '@/store/skuMapper.slice'
import {
  useGetChannelSkusQuery,
  useGetSkuMappingOptionsQuery,
  useLazyGetChannelSkusQuery,
  useSaveBindingsMutation,
  type ChannelSku,
  type InternalSku,
  type MappingStatus,
} from '@/services/api/skuMapping.api'
import { componentsOf, pendingChanges, toBindingChanges, type DraftAction } from './bindingDraft'
import { COMPACT_FROM, GRAPH_LIMIT, INITIAL_LOAD, type NodeStatus } from './constants'
import { DEFAULT_SKU_MAPPING_FILTERS, scopeOf, type SkuMappingFilterValues } from './filters'

/**
 * Everything the SKU Mapper screen does, kept out of the markup: staged filters, the channel SKUs on the graph
 * (keys only; their rows always come from the server), the unsaved draft, and save.
 */
export function useSkuMapper() {
  const { success, failure, info } = useApiFeedback()
  const { data: channels = [] } = useGetSkuMappingOptionsQuery()

  // Graph, draft and applied filters live in the store so they survive a visit to a binding's history
  const appDispatch = useAppDispatch()
  const { graphKeys, draft, filters: storedFilters } = useAppSelector((state) => state.skuMapper)
  const setGraphKeys = useCallback((keys: string[]) => appDispatch(graphKeysSet(keys)), [appDispatch])
  const dispatch = useCallback((action: DraftAction) => appDispatch(draftActed(action)), [appDispatch])
  const rememberFilters = useCallback((applied: SkuMappingFilterValues) => appDispatch(filtersApplied(applied)), [appDispatch])
  /** A filter change that would drop unsaved edits, waiting for confirmation. */
  const [pendingFilters, setPendingFilters] = useState<SkuMappingFilterValues | null>(null)

  const filters = useStagedFilters(DEFAULT_SKU_MAPPING_FILTERS, rememberFilters, storedFilters)
  const scope = useMemo(() => scopeOf(filters.applied), [filters.applied])
  const channel = channels.find((option) => option.id === scope.channel) ?? { id: scope.channel, name: scope.channel, marketplaces: [], fulfillments: [], referenceLabel: '' }

  // Totals for the KPI cards; the first rows (unmapped first) seed an empty graph
  const overview = useGetChannelSkusQuery({ ...scope, page: 1, limit: INITIAL_LOAD })
  const graph = useGetChannelSkusQuery(
    { channel: scope.channel, marketplaces: [], fulfillments: [], keys: graphKeys, page: 1, limit: GRAPH_LIMIT },
    { skip: graphKeys.length === 0 }
  )
  const [fetchUnmapped, unmapped] = useLazyGetChannelSkusQuery()
  const [save, saving] = useSaveBindingsMutation()

  const rows = useMemo(() => {
    const keys = new Set(graphKeys)
    return graphKeys.length === 0 ? [] : (graph.data?.data ?? []).filter((row) => keys.has(row.key))
  }, [graph.data, graphKeys])
  const selectedRow = rows.find((row) => row.key === draft.selected) ?? null

  const seeded = useRef<string | null>(null)
  useEffect(() => {
    const scopeKey = JSON.stringify(scope)
    if (!overview.data || seeded.current === scopeKey) return
    seeded.current = scopeKey
    if (graphKeys.length === 0) setGraphKeys(overview.data.data.map((row) => row.key))
  }, [overview.data, scope, graphKeys.length, setGraphKeys])

  const pending = useMemo(() => pendingChanges(draft, rows), [draft, rows])
  const dirty = pending.length > 0
  const locked = useMemo(() => new Set(Object.keys(draft.overrides)), [draft.overrides])

  // Leaving the page with unsaved edits asks first
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  /** Applies the filters; a channel switch drops the graph (its keys belong to the old channel). */
  const commitFilters = useCallback(
    (next: SkuMappingFilterValues, run: () => void) => {
      if (next.channel !== filters.applied.channel) {
        setGraphKeys([])
        dispatch({ type: 'reset' })
      }
      run()
    },
    [filters.applied.channel]
  )
  const applyFilters = () => (dirty && filters.draft.channel !== filters.applied.channel ? setPendingFilters(filters.draft) : commitFilters(filters.draft, filters.apply))
  const resetFilters = () => (dirty && DEFAULT_SKU_MAPPING_FILTERS.channel !== filters.applied.channel ? setPendingFilters(DEFAULT_SKU_MAPPING_FILTERS) : commitFilters(DEFAULT_SKU_MAPPING_FILTERS, filters.reset))
  const confirmFilters = () => {
    if (!pendingFilters) return
    commitFilters(pendingFilters, pendingFilters === DEFAULT_SKU_MAPPING_FILTERS ? filters.reset : filters.apply)
    setPendingFilters(null)
  }

  const addRows = (added: ChannelSku[]) => {
    setGraphKeys([...graphKeys, ...added.map((row) => row.key).filter((key) => !graphKeys.includes(key))].slice(0, GRAPH_LIMIT))
    if (added.length === 1) dispatch({ type: 'select', key: added[0].key })
  }
  const removeKeys = (keys: string[]) => {
    const removing = keys.filter((key) => !locked.has(key))
    setGraphKeys(graphKeys.filter((key) => !removing.includes(key)))
    dispatch({ type: 'remove', keys: removing })
  }
  const clearGraph = () => removeKeys(graphKeys)

  /** Loads every SKU of the given status (all statuses when omitted) onto the graph, up to the graph limit. */
  const loadByStatus = async (statuses?: MappingStatus[], label = 'matching') => {
    try {
      const result = await fetchUnmapped({ ...scope, statuses, page: 1, limit: GRAPH_LIMIT }).unwrap()
      const free = GRAPH_LIMIT - graphKeys.length
      const fresh = result.data.filter((row) => !graphKeys.includes(row.key))
      addRows(fresh.slice(0, free))
      if (fresh.length > free) info(`Graph limit reached (${GRAPH_LIMIT} SKUs): ${fresh.length - free} ${label} SKUs were not loaded.`)
    } catch (error) {
      failure(error, `Could not load the ${label} SKUs`)
    }
  }

  const bindInternal = (internal: Pick<InternalSku, 'productId' | 'sku' | 'name' | 'onHand'>) => {
    if (selectedRow) dispatch({ type: 'bind', row: selectedRow, internal })
    else dispatch({ type: 'place', internal: internal as InternalSku })
  }

  /** Ticking internal SKUs binds them to the selected channel SKU (or only places them when none is selected). */
  const addInternal = (items: InternalSku[]) => items.forEach(bindInternal)
  const removeInternal = (productIds: number[]) =>
    productIds.forEach((productId) => (selectedRow ? dispatch({ type: 'unbind', row: selectedRow, productId }) : dispatch({ type: 'unplace', productId })))
  /** What the internal picker shows as ticked: the selected SKU's components, else the placed ones. */
  const pickedInternal: InternalSku[] = selectedRow ? componentsOf(draft, selectedRow).map((component) => ({ ...component, onHand: component.onHand ?? null })) : draft.placed

  /** Internal nodes the graph can bind by id: bound ones plus placed ones. */
  const internalById = useMemo(() => {
    const byId = new Map<number, Pick<InternalSku, 'productId' | 'sku' | 'name' | 'onHand'>>()
    for (const row of rows) for (const component of componentsOf(draft, row)) byId.set(component.productId, { ...component, onHand: component.onHand ?? null })
    for (const item of draft.placed) byId.set(item.productId, item)
    return byId
  }, [rows, draft])

  const saveChanges = async () => {
    try {
      const { saved } = await save({ channel: scope.channel, changes: toBindingChanges(draft, rows) }).unwrap()
      dispatch({ type: 'clearEdits' })
      success(`Saved: ${saved} ${saved === 1 ? 'SKU binding' : 'SKU bindings'} updated`)
    } catch (error) {
      failure(error, 'Could not save the bindings')
    }
  }

  const statusOf = (row: ChannelSku): NodeStatus => (locked.has(row.key) ? 'edited' : row.status)

  return {
    channels,
    channel,
    filters: { ...filters, apply: applyFilters, reset: resetFilters },
    confirmFilters: { open: pendingFilters !== null, confirm: confirmFilters, cancel: () => setPendingFilters(null) },
    scope,
    summary: overview.data?.summary,
    // Until the keyed rows arrive the graph would read as empty, so it shows the spinner instead
    loading: overview.isLoading || (graphKeys.length > 0 && rows.length === 0 && (graph.isLoading || graph.isFetching)),
    fetching: graph.isFetching,
    error: overview.isError || graph.isError,
    rows,
    graphKeys,
    compact: rows.length >= COMPACT_FROM,
    full: graphKeys.length >= GRAPH_LIMIT,
    draft,
    selectedRow,
    selectedComponents: selectedRow ? componentsOf(draft, selectedRow) : [],
    componentsOf: (row: ChannelSku) => componentsOf(draft, row),
    statusOf,
    locked,
    pending,
    pendingSkus: locked.size,
    saving: saving.isLoading,
    loadingUnmapped: unmapped.isFetching,
    select: (key: string | null) => dispatch({ type: 'select', key }),
    addRows,
    removeKeys,
    clearGraph,
    loadByStatus,
    addInternal,
    removeInternal,
    pickedInternal,
    /** A line drawn from a channel SKU to an internal SKU binds exactly that pair (×1), whichever SKU is selected. */
    connect: (rowKey: string, productId: number) => {
      const row = rows.find((item) => item.key === rowKey)
      const internal = internalById.get(productId)
      if (row && internal) dispatch({ type: 'bind', row, internal })
    },
    setQuantity: (row: ChannelSku, productId: number, quantity: number) => dispatch({ type: 'quantity', row, productId, quantity }),
    /** Unbinds from the selected channel SKU; the internal node stays on the graph. */
    unbind: removeInternal,
    discard: () => dispatch({ type: 'clearEdits' }),
    saveChanges,
  }
}
