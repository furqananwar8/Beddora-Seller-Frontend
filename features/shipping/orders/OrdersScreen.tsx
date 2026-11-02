'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FilterBar, FilterItem, FunnelIcon } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetChannelOrdersQuery, useGetOrderChannelsQuery, useRetryChannelSyncMutation } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { MARKETPLACES } from '@/utils/marketplaces'
import { FULFILLMENT_META } from '../shippingMeta'
import type { ChannelId, ChannelOrderRef, Fulfillment } from '../types'
import { PrintDialog } from '../print/PrintDialog'
import { OrderDrawer } from './OrderDrawer'
import { OrdersTable } from './OrdersTable'
import { useOrderInvoiceDownload } from './useOrderInvoiceDownload'

const PAGE_SIZE = 20

interface Filters extends Record<string, unknown> {
  search: string
  channels: ChannelId[]
  /** Marketplace countries: "CA", "US", "MX". */
  countries: string[]
  states: Fulfillment[]
  ordered: DateRangeValue
}

const DEFAULT_FILTERS: Filters = { search: '', channels: [], countries: [], states: [], ordered: { startDate: null, endDate: null } }
/** Canada, USA, Mexico: the marketplaces the profit screens offer, by country. */
const MARKETPLACE_OPTIONS: FilterOption<string>[] = MARKETPLACES.map((marketplace) => ({ value: marketplace.code, label: marketplace.name }))
const FULFILLMENT_OPTIONS: FilterOption<Fulfillment>[] = (Object.keys(FULFILLMENT_META) as Fulfillment[]).map((value) => ({ value, label: FULFILLMENT_META[value].label }))

const day = (value: string | null) => (value ? value.slice(0, 10) : undefined)

/**
 * Shipping › Orders: seller-fulfilled channel orders to book with our carriers ("Get rates"), and orders shipped on
 * the channel with its own carrier, shown with the channel's tracking. Get details in a row's actions opens the order's drawer; `?search=`
 * starts the list searched.
 */
export const OrdersScreen: React.FC = () => {
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const { success, failure, info } = useApiFeedback()
  const params = useSearchParams()
  const [page, setPage] = useState(1)
  const [initial] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, search: params.get('search') ?? '' }))
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1), initial)
  const { draft, setDraft, applied, changed } = filters
  const [retrySync] = useRetryChannelSyncMutation()
  const [retrying, setRetrying] = useState<number | null>(null)
  const [opened, setOpened] = useState<ChannelOrderRef | null>(null)
  const [printing, setPrinting] = useState<number | null>(null)
  const { download: downloadInvoice, isExporting: invoiceBusy } = useOrderInvoiceDownload()

  const { data: channels = [], isLoading: loadingChannels } = useGetOrderChannelsQuery()
  const channelOptions: FilterOption<ChannelId>[] = channels.map((channel) => ({ value: channel.id, label: channel.label, disabledReason: channel.connected ? undefined : 'Not connected' }))

  const { data, isLoading, isFetching, isError } = useGetChannelOrdersQuery({
    page,
    limit: PAGE_SIZE,
    search: applied.search.trim(),
    channels: applied.channels,
    countries: applied.countries,
    states: applied.states,
    from: day(applied.ordered.startDate),
    to: day(applied.ordered.endDate),
  })

  const retry = async (bookingId: number) => {
    setRetrying(bookingId)
    try {
      const shipment = await retrySync(bookingId).unwrap()
      if (shipment.channelOrder?.sync === 'SENT') success('Order marked shipped')
      else info(shipment.channelOrder?.syncMessage ?? 'The channel has not accepted the update yet')
    } catch (error) {
      failure(error, 'Could not mark the order shipped')
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Orders</h1>

      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Type a search or pick filters, then filter</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset} applyLabel="Filter" applyIcon={<FunnelIcon />}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="order-search">
              <input
                id="order-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Order #, customer order #, SKU, tracking #…"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Channel" htmlFor="order-channel">
              <FilterMultiSelect id="order-channel" options={channelOptions} value={draft.channels} onChange={(value) => setDraft('channels', value)} anyLabel="All channels" highlighted={changed.has('channels')} loading={loadingChannels} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Marketplace" htmlFor="order-marketplace">
              <FilterMultiSelect id="order-marketplace" options={MARKETPLACE_OPTIONS} value={draft.countries} onChange={(value) => setDraft('countries', value)} anyLabel="All marketplaces" highlighted={changed.has('countries')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Fulfillment" htmlFor="order-fulfillment">
              <FilterMultiSelect id="order-fulfillment" options={FULFILLMENT_OPTIONS} value={draft.states} onChange={(value) => setDraft('states', value)} anyLabel="Any fulfillment" highlighted={changed.has('states')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Order date">
              <div className={cn(FILL_PICKER, changed.has('ordered') && 'ring-1 ring-primary-500')}>
                <DateRangePicker value={draft.ordered} onChange={(range) => setDraft('ordered', range)} showPresets={false} placeholder="Any date" />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-320px)] min-h-[240px] overflow-auto">
          <OrdersTable
            rows={data?.data ?? []}
            isLoading={isLoading}
            isError={isError}
            filtered={filters.appliedCount > 0}
            canWrite={canWrite}
            retrying={retrying}
            onRetrySync={(id) => void retry(id)}
            onOpen={({ channel, market, orderId }) => setOpened({ channel, market, orderId })}
            onPrintLabel={setPrinting}
            onDownloadInvoice={downloadInvoice}
            invoiceBusy={invoiceBusy}
          />
        </div>
        {data && data.totalRecords > 0 && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="orders" />}
      </div>

      <OrderDrawer order={opened} canWrite={canWrite} onClose={() => setOpened(null)} />
      <PrintDialog shipmentId={printing} initialDocument="label" onClose={() => setPrinting(null)} />
    </div>
  )
}
