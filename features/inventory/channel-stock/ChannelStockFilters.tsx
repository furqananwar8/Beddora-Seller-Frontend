'use client'

import React, { useMemo } from 'react'
import { MultiSelectInput, type MultiSelectOption } from '@/components/multi-select-input/MultiSelectInput'
import { ProfitDashboardHeader } from '@/features/profit/dashboard/components/ProfitDashboardHeader'
import type { ChannelStockChannel } from '@/services/api/channelStock.api'

export type ChannelStockFilterValues = {
  channel: string
  /** Empty = every marketplace of the channel. */
  marketplaces: string[]
  /** Empty = every fulfillment option of the channel. */
  fulfillments: string[]
  search: string
}

export const DEFAULT_CHANNEL_STOCK_FILTERS: ChannelStockFilterValues = { channel: 'amazon', marketplaces: [], fulfillments: [], search: '' }

interface ChannelStockFiltersProps {
  channels: ChannelStockChannel[]
  draft: ChannelStockFilterValues
  onChange: <K extends keyof ChannelStockFilterValues>(key: K, value: ChannelStockFilterValues[K]) => void
  onApply: () => void
  pending: boolean
  disabled?: boolean
}

/**
 * A multi-select where "nothing picked" means "all": every option shows ticked, and picking all of them again
 * stores the empty list, so the API gets no filter.
 */
function AllWhenEmptySelect({ title, options, value, onChange }: { title: string; options: MultiSelectOption[]; value: string[]; onChange: (value: string[]) => void }) {
  const allIds = options.map((option) => option.id)
  return (
    <MultiSelectInput
      title={title}
      options={options}
      value={value.length > 0 ? value : allIds}
      onChange={(next) => onChange(next.length === allIds.length ? [] : next)}
    />
  )
}

/** The Settlement Report's filter bar: search on the left, dropdowns and Apply Filters on the right. */
export const ChannelStockFilters: React.FC<ChannelStockFiltersProps> = ({ channels, draft, onChange, onApply, pending, disabled }) => {
  const channel = useMemo(() => channels.find((option) => option.id === draft.channel), [channels, draft.channel])

  const selectChannel = (id: string) => {
    if (id === draft.channel) return
    // Marketplace and fulfillment options belong to the channel
    onChange('channel', id)
    onChange('marketplaces', [])
    onChange('fulfillments', [])
  }

  return (
    <ProfitDashboardHeader
      searchTerm={draft.search}
      onSearchChange={(value) => onChange('search', value)}
      searchPlaceholder={draft.channel === 'amazon' ? 'Search SKU, ASIN or product' : 'Search SKU or product'}
      searchWidth="w-[40%]"
      showDateRange={false}
      showMarketplace={false}
      showCurrency={false}
      extraFilters={
        <>
          <div className="min-w-[140px] shrink-0">
            <MultiSelectInput single title="Channel" options={channels} value={[draft.channel]} onChange={(value) => selectChannel(value[0])} />
          </div>
          <div className="min-w-[180px] shrink-0">
            <AllWhenEmptySelect title="Marketplace" options={channel?.marketplaces ?? []} value={draft.marketplaces} onChange={(value) => onChange('marketplaces', value)} />
          </div>
          <div className="min-w-[160px] shrink-0">
            <AllWhenEmptySelect title="Fulfillment" options={channel?.fulfillments ?? []} value={draft.fulfillments} onChange={(value) => onChange('fulfillments', value)} />
          </div>
        </>
      }
      onFilter={onApply}
      filterPending={pending}
      disabled={disabled}
    />
  )
}
