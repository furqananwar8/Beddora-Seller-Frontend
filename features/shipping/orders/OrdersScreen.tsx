'use client'

import React, { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FilterBar, FilterItem, FunnelIcon } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { ExportExcelButton } from '@/components/export-button/ExportExcelButton'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { useFitToViewport } from '@/hooks/useFitToViewport'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useScanItems } from '@/features/barcode/session/useScanItems'
import { useDeleteShipmentDraftMutation, useGetChannelOrdersQuery, useGetOrderChannelsQuery, useRetryChannelSyncMutation } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { MARKETPLACES } from '@/utils/marketplaces'
import { FULFILLMENT_META } from '../shippingMeta'
import type { ChannelId, ChannelOrderRef, Fulfillment, OrderListItem, OrderOrigin } from '../types'
import { PrintDialog } from '../print/PrintDialog'
import { BookingDrawer } from './BookingDrawer'
import { BulkSelectionBar } from './bulk/BulkSelectionBar'
import { BULK_LIMIT, isSelectable, orderKey } from './bulk/bulkSelection'
import { OrderDrawer } from './OrderDrawer'
import { OrdersTable } from './OrdersTable'
import { useOrderInvoiceDownload } from './useOrderInvoiceDownload'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 20

interface Filters extends Record<string, unknown> {
  search: string
  channels: ChannelId[]
  /** Marketplace countries: "CA", "US", "MX". */
  countries: string[]
  states: Fulfillment[]
  /** Channel orders and/or shipments created by hand; none or both means all. */
  origins: OrderOrigin[]
  ordered: DateRangeValue
}

const DEFAULT_FILTERS: Filters = { search: '', channels: [], countries: [], states: [], origins: [], ordered: { startDate: null, endDate: null } }
/** Canada, USA, Mexico: the marketplaces the profit screens offer, by country. */
const MARKETPLACE_OPTIONS: FilterOption<string>[] = MARKETPLACES.map((marketplace) => ({ value: marketplace.code, label: marketplace.name }))
const FULFILLMENT_OPTIONS: FilterOption<Fulfillment>[] = (Object.keys(FULFILLMENT_META) as Fulfillment[]).map((value) => ({ value, label: FULFILLMENT_META[value].label }))

const ORIGIN_OPTIONS: FilterOption<OrderOrigin>[] = [
  { value: 'CHANNEL', label: 'Channel orders' },
  { value: 'MANUAL', label: 'Manual shipments' },
]

const csvParam = <T extends string>(value: string | null, allowed: readonly T[]): T[] => (value?.split(',').filter((item): item is T => (allowed as readonly string[]).includes(item)) ?? [])

/** The list's starting filters from the address: the Overview's links open the list with the slice they counted. */
function filtersFromAddress(params: URLSearchParams | ReturnType<typeof useSearchParams>): Filters {
  const from = params.get('from')
  const to = params.get('to')
  return {
    ...DEFAULT_FILTERS,
    search: params.get('search') ?? '',
    states: csvParam(params.get('states'), Object.keys(FULFILLMENT_META) as Fulfillment[]),
    channels: csvParam(params.get('channels'), ['walmart', 'amazon', 'temu'] as const),
    countries: csvParam(params.get('countries'), MARKETPLACES.map((marketplace) => marketplace.code)),
    ordered: { startDate: from, endDate: to },
  }
}

const day = (value: string | null) => (value ? value.slice(0, 10) : undefined)

/** The booking drawer's shipment lives in the address (`?shipment=184`), so it can be linked to and Back closes it. */
function useOpenShipment() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const id = Number(params.get('shipment'))
  const open = useCallback(
    (shipmentId: number | null) => {
      const next = new URLSearchParams(params.toString())
      if (shipmentId === null) next.delete('shipment')
      else next.set('shipment', String(shipmentId))
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )
  return { openId: Number.isInteger(id) && id > 0 ? id : null, open }
}

/**
 * Shipping › Orders: seller-fulfilled channel orders to book with our carriers ("Get rates"), and orders shipped on
 * the channel with its own carrier, shown with the channel's tracking. Get details in a row's actions opens the order's drawer; `?search=`
 * starts the list searched.
 */
export const OrdersScreen: React.FC = () => {
  const fit = useFitToViewport<HTMLDivElement>()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'shipping:orders')
  const canScan = ability.can('write', 'barcode:scan-items')
  const scanItems = useScanItems()
  const { success, failure, info } = useApiFeedback()
  const params = useSearchParams()
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [initial] = useState<Filters>(() => filtersFromAddress(params))
  // Ticked orders by key, kept across pages and cleared when the filters change (so nothing hidden is acted on)
  const [selected, setSelected] = useState<Map<string, OrderListItem>>(new Map())
  const filters = useStagedFilters(DEFAULT_FILTERS, () => {
    setPage(1)
    setSelected(new Map())
  }, initial)
  const { draft, setDraft, applied, changed } = filters
  const [retrySync] = useRetryChannelSyncMutation()
  const [retrying, setRetrying] = useState<number | null>(null)
  const [opened, setOpened] = useState<ChannelOrderRef | null>(null)
  const [printing, setPrinting] = useState<number | null>(null)
  const { download: downloadInvoice, isExporting: invoiceBusy } = useOrderInvoiceDownload()
  const { openId: openShipmentId, open: openShipment } = useOpenShipment()
  const [deletingDraft, setDeletingDraft] = useState<OrderListItem | null>(null)
  const [deleteDraft, { isLoading: deleting }] = useDeleteShipmentDraftMutation()

  const { data: channels = [], isLoading: loadingChannels } = useGetOrderChannelsQuery()
  const channelOptions: FilterOption<ChannelId>[] = channels.map((channel) => ({ value: channel.id, label: channel.label, disabledReason: channel.connected ? undefined : 'Not connected' }))

  const { data, isLoading, isFetching, isError } = useGetChannelOrdersQuery({
    page,
    limit: pageSize,
    search: applied.search.trim(),
    channels: applied.channels,
    countries: applied.countries,
    states: applied.states,
    origin: applied.origins.length === 1 ? applied.origins[0] : 'ALL',
    from: day(applied.ordered.startDate),
    to: day(applied.ordered.endDate),
  })

  const toggleOrder = (row: OrderListItem) =>
    setSelected((current) => {
      const next = new Map(current)
      const key = orderKey(row)
      if (next.has(key)) next.delete(key)
      else if (next.size >= BULK_LIMIT) info(`Pick at most ${BULK_LIMIT} orders at a time`)
      else next.set(key, row)
      return next
    })
  const togglePage = (on: boolean) =>
    setSelected((current) => {
      const next = new Map(current)
      for (const row of (data?.data ?? []).filter(isSelectable)) {
        if (!on) next.delete(orderKey(row))
        else if (next.size < BULK_LIMIT) next.set(orderKey(row), row)
      }
      return next
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
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ExportExcelButton
          report="shipping-orders"
          noun="orders export"
          filters={{
            search: applied.search.trim() || undefined,
            channels: applied.channels,
            countries: applied.countries,
            states: applied.states,
            origin: applied.origins.length === 1 ? applied.origins[0] : 'ALL',
            from: day(applied.ordered.startDate),
            to: day(applied.ordered.endDate),
          }}
        />
      </div>

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
            <FormField label="Origin" htmlFor="order-origin">
              <FilterMultiSelect id="order-origin" options={ORIGIN_OPTIONS} value={draft.origins} onChange={(value) => setDraft('origins', value)} anyLabel="Manual and channel" highlighted={changed.has('origins')} />
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

      {selected.size > 0 && <BulkSelectionBar rows={[...selected.values()]} canWrite={canWrite} onClear={() => setSelected(new Map())} />}

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        {/* Fitted to the window: the sideways scrollbar stays in view and the vertical one starts under the header */}
        <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-320px)] min-h-[240px] overflow-auto">
          <OrdersTable
            rows={data?.data ?? []}
            isLoading={isLoading}
            isError={isError}
            filtered={filters.appliedCount > 0}
            canWrite={canWrite}
            retrying={retrying}
            onRetrySync={(id) => void retry(id)}
            onOpen={(row) => row.origin === 'CHANNEL' && setOpened({ channel: row.channel, market: row.market, orderId: row.orderId })}
            onPrintLabel={setPrinting}
            onDeleteDraft={setDeletingDraft}
            onDownloadInvoice={(row) => row.origin === 'CHANNEL' && downloadInvoice(row)}
            onScanItems={canScan ? ({ channel, market, orderId }) => scanItems.open({ scenario: 'FBM_ORDER', sourceId: `${channel}:${market}:${orderId}` }) : undefined}
            scanLockedBy={({ origin, channel, market, orderId }) => (origin === 'MANUAL' ? null : scanItems.lockedBy({ scenario: 'FBM_ORDER', sourceId: `${channel}:${market}:${orderId}` }))}
            invoiceBusy={invoiceBusy}
            selection={{ keys: new Set(selected.keys()), onToggle: toggleOrder, onTogglePage: togglePage }}
          />
        </div>
        {data && data.totalRecords > 0 && <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="orders" />}
      </div>

      {scanItems.dialog}
      <OrderDrawer order={opened} canWrite={canWrite} onClose={() => setOpened(null)} />
      <BookingDrawer shipmentId={openShipmentId} canWrite={canWrite} onClose={() => openShipment(null)} />
      <ConfirmDialog
        isOpen={deletingDraft !== null}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        tone="danger"
        busy={deleting}
        onClose={() => setDeletingDraft(null)}
        onConfirm={() => {
          if (!deletingDraft || deletingDraft.origin !== 'MANUAL' || deletingDraft.draftId === null) return
          const { draftId, orderId } = deletingDraft
          void deleteDraft(draftId)
            .unwrap()
            .then(() => success(`${orderId} deleted.`))
            .catch((error) => failure(error, 'Could not delete the draft'))
            .finally(() => setDeletingDraft(null))
        }}
      >
        <p>{deletingDraft?.orderId} and the customer details saved in it will be removed. This can&apos;t be undone.</p>
      </ConfirmDialog>
      <PrintDialog shipmentId={printing} initialDocument="label" onClose={() => setPrinting(null)} />
    </div>
  )
}
