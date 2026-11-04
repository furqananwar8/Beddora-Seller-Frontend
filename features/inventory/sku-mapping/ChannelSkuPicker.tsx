'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { useGetChannelSkusQuery, type ChannelSku, type ChannelSkuSummary, type MappingStatus } from '@/services/api/skuMapping.api'
import { useDebounce } from '@/utils/debounce'
import { GRAPH_LIMIT, marketplaceName } from './constants'
import type { ListingScope } from './filters'
import { MappingStatusBadge } from './MappingStatusBadge'

type Tab = 'all' | MappingStatus

const PICKER_LIMIT = 100

interface ChannelSkuPickerProps {
  scope: ListingScope
  summary: ChannelSkuSummary | undefined
  channelLabel: string
  onGraph: ChannelSku[]
  /** Keys with unsaved edits: they stay on the graph until saved or discarded. */
  locked: Set<string>
  onAdd: (rows: ChannelSku[]) => void
  onRemove: (keys: string[]) => void
  onClear: () => void
  /** Loads every SKU of these statuses (all when undefined). */
  onLoadByStatus: (statuses: MappingStatus[] | undefined, label: string) => void
  loading: boolean
}

interface TabOption {
  value: Tab
  /** Short name used in the tab and in "Load all …". */
  name: string
  count: number | undefined
}

const describe = (row: ChannelSku) => {
  const bound = row.components.map((component) => `${component.sku} ×${component.quantity}`).join(', ')
  return `${marketplaceName(row.marketplace)} · ${bound || 'Unmapped'}`
}

/** "Channel SKUs on graph": search, status tabs, tick to load a SKU with its internal nodes. */
export const ChannelSkuPicker: React.FC<ChannelSkuPickerProps> = ({ scope, summary, channelLabel, onGraph, locked, onAdd, onRemove, onClear, onLoadByStatus, loading }) => {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const term = useDebounce(search.trim(), 300)
  const { data, isFetching } = useGetChannelSkusQuery({
    ...scope,
    search: term || scope.search,
    statuses: tab === 'all' ? undefined : [tab],
    page: 1,
    limit: PICKER_LIMIT,
  })

  const onGraphKeys = new Set(onGraph.map((row) => row.key))
  const full = onGraph.length >= GRAPH_LIMIT

  const change = (next: ChannelSku[]) => {
    const nextKeys = new Set(next.map((row) => row.key))
    const added = next.filter((row) => !onGraphKeys.has(row.key))
    const removed = onGraph.filter((row) => !nextKeys.has(row.key)).map((row) => row.key)
    if (added.length > 0) onAdd(added)
    if (removed.length > 0) onRemove(removed)
  }

  const tabOptions: TabOption[] = [
    { value: 'all', name: 'All', count: summary?.total },
    { value: 'mapped', name: 'Mapped', count: summary?.mapped },
    { value: 'unmapped', name: 'Unmapped', count: summary ? summary.unmapped - summary.new : undefined },
    { value: 'new', name: 'New', count: summary?.new },
  ]
  const tabs = tabOptions.map(({ value, name, count }) => ({ value, label: `${name} ${count ?? ''}`.trim() }))
  const active = tabOptions.find((option) => option.value === tab) ?? tabOptions[0]
  const activeCount = active.count ?? 0
  const loadLabel = tab === 'all' ? 'Load all SKUs' : `Load all ${active.name.toLowerCase()}`

  return (
    <SearchableSelect<ChannelSku>
      multiple
      ariaLabel="Channel SKUs on graph"
      className="w-full sm:w-96"
      value={onGraph}
      onChange={change}
      options={data?.data ?? []}
      getKey={(row) => row.key}
      getLabel={(row) => row.sku}
      search={search}
      onSearchChange={setSearch}
      loading={isFetching}
      searchPlaceholder={`Search ${channelLabel} SKU or ${channelLabel === 'Amazon' ? 'ASIN' : 'product'}`}
      emptyText="No SKUs match."
      placeholder={`Channel SKUs on graph · 0 / ${GRAPH_LIMIT}`}
      renderValue={(rows) => `Channel SKUs on graph · ${rows.length} / ${GRAPH_LIMIT}`}
      disabledReason={(row) => (locked.has(row.key) ? 'Unsaved' : full && !onGraphKeys.has(row.key) ? 'Graph full' : null)}
      renderOption={(row) => (
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-xs text-text-primary">{row.sku}</span>
            <span className="block truncate text-xs text-text-muted">{describe(row)}</span>
          </span>
          <MappingStatusBadge status={row.status} />
        </span>
      )}
      // The footer carries its own Done so tabs and actions get the menu's full width instead of sharing a row with it
      doneLabel={false}
      footer={(close) => (
        <div className="space-y-2 p-1">
          <SegmentedToggle<Tab>
            ariaLabel="Mapping status"
            value={tab}
            onChange={setTab}
            options={tabs}
            className="grid w-full grid-cols-4 [&>button]:min-w-0 [&>button]:truncate [&>button]:px-1 [&>button]:text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={activeCount === 0 || full || loading}
            onClick={() => {
              onLoadByStatus(tab === 'all' ? undefined : [tab], active.name.toLowerCase())
              close()
            }}
          >
            {loadLabel} ({activeCount})
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={onGraph.length === 0}>
              Clear graph
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      )}
    />
  )
}
