'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { KpiCard } from '@/design-system/kpi'
import { useGetChannelStockOptionsQuery, useGetChannelStockQuery } from '@/services/api/channelStock.api'
import { cn } from '@/utils/cn'
import { RESPONSIVE_TILE_COLUMNS } from '@/features/profit/dashboard/SummaryTiles'
import { ChannelStockFilters, DEFAULT_CHANNEL_STOCK_FILTERS } from './ChannelStockFilters'
import { ChannelStockTable } from './ChannelStockTable'

const PAGE_SIZE = 20

const n = (value: number | null | undefined) => (value === null || value === undefined ? '–' : value.toLocaleString())

const syncedLabel = (iso: string | null | undefined) =>
  iso ? `Synced ${new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not synced yet'

export const ChannelInventoryScreen: React.FC = () => {
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_CHANNEL_STOCK_FILTERS, () => setPage(1))
  const { applied } = filters

  const { data: channels = [] } = useGetChannelStockOptionsQuery()
  const { data, isLoading, isFetching, isError } = useGetChannelStockQuery({
    channel: applied.channel,
    marketplaces: applied.marketplaces,
    fulfillments: applied.fulfillments,
    search: applied.search.trim(),
    page,
    limit: PAGE_SIZE,
  })
  const appliedChannel = channels.find((channel) => channel.id === applied.channel)
  const summary = data?.summary

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl text-text-primary">Channel Inventory (IP)</h1>
        <p className="mt-1 text-sm text-text-muted">Stock each sales channel reports, per marketplace.</p>
      </div>

      <ChannelStockFilters
        channels={channels}
        draft={filters.draft}
        onChange={filters.setDraft}
        onApply={filters.apply}
        pending={filters.pending}
        disabled={channels.length === 0}
      />

      {/* Same responsive tile row as the profit screens; `h-auto` lets the row stretch every card to the tallest
          (KpiCard's own h-full would stop that). */}
      <div className={cn(RESPONSIVE_TILE_COLUMNS, 'mb-4 [&>*]:h-auto')}>
        <KpiCard title="SKUs" value={n(summary?.skus)} />
        <KpiCard title="Available" value={n(summary?.available)} />
        <KpiCard title="Inbound" value={n(summary?.inbound)} subtitle={summary && summary.inbound === null ? 'Not reported by this channel' : undefined} />
        <KpiCard title="Out of stock" value={n(summary?.outOfStock)} />
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-420px)] overflow-auto">
          <ChannelStockTable
            rows={data?.data ?? []}
            fulfillments={appliedChannel?.fulfillments ?? []}
            referenceLabel={appliedChannel?.referenceLabel}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
        {data && (
          <>
            <PaginationFooter
              page={data.page}
              pageSize={data.limit}
              totalItems={data.totalRecords}
              totalPages={data.totalPages}
              onPageChange={setPage}
              itemLabel="SKUs"
            />
            <div className="border-t border-border px-4 py-2 text-right text-xs text-text-muted">{syncedLabel(data.syncedAt)}</div>
          </>
        )}
      </div>
    </Container>
  )
}
