'use client'

import { useFitToViewport } from '@/hooks/useFitToViewport'
import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { FILL_PICKER, FilterBar, FilterItem, FunnelIcon } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetShipmentsQuery } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { PrintDialog } from '../print/PrintDialog'
import { CREATE_HREF, PROVIDER_LABEL, PROVIDERS, STATUS_LABEL } from '../shippingMeta'
import type { ParcelShipmentListItem, ParcelStatus, ProviderId } from '../types'
import { BookingDrawer } from './BookingDrawer'
import { BookingsTable } from './BookingsTable'
import { CancelShipmentDialog } from './CancelShipmentDialog'
import { ShipmentSummaryCards } from './ShipmentSummaryCards'
import { MANUAL_SHIPMENT_FLOW } from '../shippingFlags'

const PAGE_SIZE = 20

interface Filters extends Record<string, unknown> {
  search: string
  providers: ProviderId[]
  statuses: ParcelStatus[]
  created: DateRangeValue
}

const DEFAULT_FILTERS: Filters = { search: '', providers: [], statuses: [], created: { startDate: null, endDate: null } }

const PROVIDER_OPTIONS: FilterOption<ProviderId>[] = PROVIDERS.map((value) => ({ value, label: PROVIDER_LABEL[value] }))
const STATUS_OPTIONS: FilterOption<ParcelStatus>[] = (Object.keys(STATUS_LABEL) as ParcelStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }))

const day = (value: string | null) => (value ? value.slice(0, 10) : undefined)

/** The drawer's shipment lives in the address (`?shipment=184`), so a booking can be linked to and Back closes it. */
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

/** Shipping › Bookings: every shipment from every provider, with summary cards, filters and the detail drawer. */
export const BookingsScreen: React.FC = () => {
  const fit = useFitToViewport<HTMLDivElement>()
  const canWrite = useAppAbility().can('write', 'shipping:parcels')
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters
  const { openId, open } = useOpenShipment()
  const [printing, setPrinting] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<ParcelShipmentListItem | null>(null)

  const { data, isLoading, isFetching, isError } = useGetShipmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: applied.search.trim(),
    providers: applied.providers,
    statuses: applied.statuses,
    from: day(applied.created.startDate),
    to: day(applied.created.endDate),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Bookings</h1>
        {canWrite && MANUAL_SHIPMENT_FLOW && (
          <Link href={CREATE_HREF} className="ds-button ds-button-primary ds-button-sm">
            + Create shipment
          </Link>
        )}
      </div>

      <ShipmentSummaryCards />

      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Type a search or pick filters, then filter</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset} applyLabel="Filter" applyIcon={<FunnelIcon />}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="booking-search">
              <input
                id="booking-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Tracking #, reference, recipient, SKU…"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Service provider" htmlFor="booking-provider">
              <FilterMultiSelect id="booking-provider" options={PROVIDER_OPTIONS} value={draft.providers} onChange={(value) => setDraft('providers', value)} anyLabel="All providers" highlighted={changed.has('providers')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Status" htmlFor="booking-status">
              <FilterMultiSelect id="booking-status" options={STATUS_OPTIONS} value={draft.statuses} onChange={(value) => setDraft('statuses', value)} anyLabel="All statuses" highlighted={changed.has('statuses')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Date range">
              <div className={cn(FILL_PICKER, changed.has('created') && 'ring-1 ring-primary-500')}>
                <DateRangePicker value={draft.created} onChange={(range) => setDraft('created', range)} showPresets={false} placeholder="Any date" />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-420px)] min-h-[240px] overflow-auto">
          <BookingsTable
            rows={data?.data ?? []}
            isLoading={isLoading}
            isError={isError}
            filtered={filters.appliedCount > 0}
            canWrite={canWrite}
            onOpen={(row) => open(row.id)}
            onPrint={(row) => setPrinting(row.id)}
            onCancel={setCancelling}
          />
        </div>
        {data && data.totalRecords > 0 && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="bookings" />}
      </div>

      <BookingDrawer shipmentId={openId} canWrite={canWrite} onClose={() => open(null)} />
      <PrintDialog shipmentId={printing} onClose={() => setPrinting(null)} />
      <CancelShipmentDialog shipment={cancelling} onClose={() => setCancelling(null)} />
    </div>
  )
}
