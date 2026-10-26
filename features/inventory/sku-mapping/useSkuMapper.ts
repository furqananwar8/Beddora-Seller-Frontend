'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  useGetChannelSkusQuery,
  useGetSkuMappingOptionsQuery,
  useLazyGetChannelSkusQuery,
  useSaveBindingsMutation,
  type ChannelSku,
  type InternalSku,
} from '@/services/api/skuMapping.api'
import { EMPTY_DRAFT, componentsOf, draftReducer, pendingChanges, toBindingChanges } from './bindingDraft'
import { COMPACT_FROM, GRAPH_LIMIT, INITIAL_LOAD, type NodeStatus } from './constants'
import { DEFAULT_SKU_MAPPING_FILTERS, scopeOf, type SkuMappingFilterValues } from './filters'

/**
 * Everything the SKU Mapper screen does, kept out of the markup: staged filters, the channel SKUs on the graph
 * (keys only; their rows always come from the server), the unsaved draft, and save.
 */
export function useSkuMapper() {
  const { success, failure, info } = useApiFeedback()
  const { data: channels = [] } = useGetSkuMappingOptionsQuery()

  const [graphKeys, setGraphKeys] = useState<string[]>([])
  const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT)
  /** A filter change that would drop unsaved edits, waiting for confirmation. */
  const [pendingFilters, setPendingFilters] = useState<SkuMappingFilterValues | null>(null)

  const filters = useStagedFilters(DEFAULT_SKU_MAPPING_FILTERS)
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
    setGraphKeys((current) => (current.length > 0 ? current : overview.data!.data.map((row) => row.key)))
  }, [overview.data, scope])

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
    setGraphKeys((current) => [...current, ...added.map((row) => row.key).filter((key) => !current.includes(key))].slice(0, GRAPH_LIMIT))
    if (added.length === 1) dispatch({ type: 'select', key: added[0].key })
  }
  const removeKeys = (keys: string[]) => {
    const removing = keys.filter((key) => !locked.has(key))
    setGraphKeys((current) => current.filter((key) => !removing.includes(key)))
    dispatch({ type: 'remove', keys: removing })
  }
  const clearGraph = () => removeKeys(graphKeys)

  const loadUnmapped = async () => {
    try {
      const result = await fetchUnmapped({ ...scope, statuses: ['new', 'unmapped'], page: 1, limit: GRAPH_LIMIT }).unwrap()
      const free = GRAPH_LIMIT - graphKeys.length
      const fresh = result.data.filter((row) => !graphKeys.includes(row.key))
      addRows(fresh.slice(0, free))
      if (fresh.length > free) info(`Graph limit reached (${GRAPH_LIMIT} SKUs): ${fresh.length - free} unmapped SKUs were not loaded.`)
    } catch (error) {
      failure(error, 'Could not load the unmapped SKUs')
    }
  }

  const bindInternal = (internal: Pick<InternalSku, 'productId' | 'sku' | 'name' | 'onHand'>) => {
    if (selectedRow) dispatch({ type: 'bind', row: selectedRow, internal })
    else dispatch({ type: 'place', internal: internal as InternalSku })
  }

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
    loadUnmapped,
    bindInternal,
    /** A line drawn from a channel SKU to an internal SKU binds exactly that pair (×1), whichever SKU is selected. */
    connect: (rowKey: string, productId: number) => {
      const row = rows.find((item) => item.key === rowKey)
      const internal = internalById.get(productId)
      if (row && internal) dispatch({ type: 'bind', row, internal })
    },
    setQuantity: (row: ChannelSku, productId: number, quantity: number) => dispatch({ type: 'quantity', row, productId, quantity }),
    unbind: (productId: number) => selectedRow && dispatch({ type: 'unbind', row: selectedRow, productId }),
    discard: () => dispatch({ type: 'clearEdits' }),
    saveChanges,
  }
}
