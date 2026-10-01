"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { Container } from '@/components/layout'
import DateRangePicker, { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { formatDateTime } from '@/utils/format'
import { useGetShipmentsConfigQuery } from '@/services/api/inboundShipments.api'
import {
  SellerCentralPlanStatus,
  useGetSellerCentralPlansQuery,
  useGetSellerCentralSyncStatusQuery,
  useRefreshSellerCentralPlanMutation,
  useStartSellerCentralSyncMutation,
} from '@/services/api/sellerCentralShipments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { formatRelative } from '../shipments/ShipmentParts'
import { PlanDetailModal } from './PlanDetailModal'
import { PlanStatusBadge } from './PlanStatusBadge'
import { planTitle } from './planTitle'

const PAGE_SIZE = 20
const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
/** Every control in the toolbars is this tall, so inputs, dropdowns, the date picker and buttons line up. */
const CONTROL = 'h-[42px]'
/** How often to ask the server whether the sync has ended, in case the live event never arrives. */
const SYNC_POLL_MS = 5000

const STATUS_OPTIONS = [
  { id: 'ALL', name: 'All statuses' },
  { id: 'ACTIVE', name: 'In progress' },
  { id: 'SHIPPED', name: 'Shipped' },
]

/** Longest span the server accepts in one sync. */
const MAX_SYNC_DAYS = 366

const DAY_FORMAT = 'yyyy-MM-dd'
const lastDays = (days: number) => ({
  startDate: format(subDays(new Date(), days - 1), DAY_FORMAT),
  endDate: format(new Date(), DAY_FORMAT),
})

const CUSTOM_PRESET_ID = 'custom'

/** Ready-made ranges, plus "Custom range" for picking any two dates and pressing Apply. */
const syncPresets = (current: DateRangeValue): DateRangePreset[] => [
  ...[7, 30, 90, 120].map((days) => ({
    id: String(days),
    label: `Last ${days} days`,
    getRange: () => lastDays(days),
  })),
  {
    id: CUSTOM_PRESET_ID,
    label: 'Custom range',
    // Starts from what is shown now; the calendar changes it from there
    getRange: () => ({ startDate: current.startDate ?? lastDays(30).startDate, endDate: current.endDate ?? lastDays(30).endDate }),
  },
]

const daysIn = (range: DateRangeValue): number =>
  range.startDate && range.endDate ? differenceInCalendarDays(parseISO(range.endDate), parseISO(range.startDate)) + 1 : 0

const n = (value: number) => value.toLocaleString()

export const SellerCentralScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [status, setStatus] = useState<'ALL' | SellerCentralPlanStatus>('ALL')
  const [page, setPage] = useState(1)
  const [openPlan, setOpenPlan] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeValue>(() => ({ ...lastDays(30), presetId: '30' }))
  // Presets apply at once; dates picked on the calendar only count after Apply is pressed
  const [applied, setApplied] = useState(true)
  const presets = useMemo(() => syncPresets(range), [range])

  const { data: config } = useGetShipmentsConfigQuery()
  const { data, isLoading, isFetching, isError } = useGetSellerCentralPlansQuery({
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  })

  // The sync runs on the server; its end arrives as a live event that refreshes these queries
  const [pollMs, setPollMs] = useState(0)
  const { data: syncStatus } = useGetSellerCentralSyncStatusQuery(undefined, { pollingInterval: pollMs })
  const [startSync, { isLoading: starting }] = useStartSellerCentralSyncMutation()
  const [refreshPlan] = useRefreshSellerCentralPlanMutation()
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const syncing = starting || Boolean(syncStatus?.running)
  useEffect(() => setPollMs(syncStatus?.running ? SYNC_POLL_MS : 0), [syncStatus?.running])

  const rows = data?.data ?? []
  const rangeDays = daysIn(range)
  const tooLong = rangeDays > MAX_SYNC_DAYS
  const rangeReady = rangeDays > 0 && !tooLong && applied

  const notify = (message: string, type: 'success' | 'error' | 'info') => dispatch(addNotification({ message, type }))

  const handleRefresh = async (planId: string, name: string) => {
    setRefreshingId(planId)
    try {
      await refreshPlan(planId).unwrap()
      notify(`${name} refreshed from Amazon`, 'success')
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not refresh from Amazon'), 'error')
    } finally {
      setRefreshingId(null)
    }
  }

  const handleCopy = async (planId: string) => {
    try {
      await navigator.clipboard.writeText(planId)
      notify('Plan ID copied', 'success')
    } catch {
      notify('Could not copy to the clipboard', 'error')
    }
  }

  const handleSync = async () => {
    if (!range.startDate || !range.endDate || syncing) return
    try {
      const { started } = await startSync({ from: range.startDate, to: range.endDate }).unwrap()
      notify(
        started
          ? 'Sync in progress. It keeps running in the background, and we’ll tell you here when it’s done.'
          : 'A sync is already in progress.',
        'info'
      )
    } catch (err) {
      const timedOut = (err as { status?: string })?.status === 'TIMEOUT_ERROR'
      notify(timedOut ? 'The server didn’t answer in time. Check your connection and try again.' : apiErrorMessage(err, 'Could not start the sync'), 'error')
    }
  }

  const selected = rangeDays > 0 ? `${n(rangeDays)} day${rangeDays === 1 ? '' : 's'}` : null
  const lastResult = syncStatus?.result
  const statusLine = syncing
    ? `Syncing ${syncStatus?.range ? `${syncStatus.range.from} to ${syncStatus.range.to}` : 'now'}. You can leave this page; we’ll notify you when it’s done.`
    : tooLong
    ? `That’s ${n(rangeDays)} days. Pick at most ${MAX_SYNC_DAYS} days at a time.`
    : !applied && selected
    ? `${selected} chosen. Press Apply in the calendar to use these dates.`
    : syncStatus?.error
    ? `The last sync failed: ${syncStatus.error}`
    : [
        selected ? `${selected} selected` : 'Pick the days to sync',
        lastResult
          ? `last sync: ${n(lastResult.added)} new, ${n(lastResult.detailed)} updated${lastResult.failed ? `, ${n(lastResult.failed)} couldn’t be read` : ''}`
          : data?.lastSyncedAt
          ? `last synced ${formatRelative(data.lastSyncedAt)}`
          : 'never synced',
      ].join(' · ')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-4 px-1 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Seller Central shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            Shipments created in Seller Central (Send to Amazon). Pick the days to sync, then open any shipment to see its details.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Fixed width: the button's text changes as dates are picked, and the header must not reflow */}
            <div
              className={cn('w-full sm:w-[290px] [&>div]:block [&>div]:w-full', syncing && 'pointer-events-none opacity-60')}
              aria-disabled={syncing}
            >
              <DateRangePicker
                value={range}
                onChange={(next) => {
                  setRange(next)
                  setApplied(Boolean(next.presetId) && next.presetId !== CUSTOM_PRESET_ID)
                }}
                presets={presets}
                keepOpenPresetIds={[CUSTOM_PRESET_ID]}
                // Only a custom range needs Apply; the fixed presets pick their range and close the picker themselves
                applyAction={applied ? undefined : { label: 'Apply', disabled: rangeDays === 0, onApply: () => setApplied(true) }}
                disableFutureDates
                placement="right"
                placeholder="Select days to sync"
                triggerClassName={cn(CONTROL, 'w-full justify-between py-0')}
              />
            </div>
            <Button className={cn(CONTROL, 'w-full sm:w-auto')} onClick={handleSync} disabled={syncing || !rangeReady}>
              {syncing ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" /> Sync in progress…
                </span>
              ) : (
                'Sync from Amazon'
              )}
            </Button>
          </div>
          <span className={cn('text-xs lg:text-right', tooLong || (!syncing && syncStatus?.error) ? 'text-danger-600' : 'text-text-muted')} aria-live="polite">
            {statusLine}
          </span>
        </div>
      </div>

      {config?.sandbox && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <strong>Amazon sandbox mode.</strong> Amazon&apos;s sandbox holds no Seller Central shipments, so syncing finds nothing.
          Turn off FBA_SANDBOX to sync your real account.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search plan, FBA shipment ID, FC, SKU or ASIN"
          aria-label="Search shipments"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className={cn(
            CONTROL,
            'min-w-0 flex-1 basis-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 sm:min-w-[260px] sm:basis-auto sm:max-w-md'
          )}
        />
        <MultiSelectInput
          single
          title="Status"
          options={STATUS_OPTIONS}
          value={[status]}
          onChange={(value) => {
            setStatus((value[0] as 'ALL' | SellerCentralPlanStatus) ?? 'ALL')
            setPage(1)
          }}
        />
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-340px)] min-h-[240px] overflow-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={cn(HEAD, 'min-w-[260px]')}>Shipment plan</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[120px]')}>Marketplace</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[120px]')}>Status</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[110px]')}>Shipments</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[90px]')}>Units</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[80px]')}>SKUs</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[160px]')}>Destinations</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[170px]')}>Last changed</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError || rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className={cn('py-12 text-center', isError ? 'font-medium text-danger-600' : 'text-text-muted')}>
                      {isError
                        ? 'Could not load shipments.'
                        : debouncedSearch || status !== 'ALL'
                        ? 'No shipments match your filters.'
                        : 'No Seller Central shipments yet. Pick the days to cover and press Sync from Amazon.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((plan) => (
                  <TableRow key={plan.inboundPlanId}>
                    <TableCell className={CELL}>
                      {(plan.name.trim() || plan.isNew) && (
                        <div className="flex items-center justify-center gap-2 font-medium text-text-primary">
                          {plan.name.trim() && <span>{plan.name}</span>}
                          {plan.isNew && <Badge variant="success">New</Badge>}
                        </div>
                      )}
                      <div className="font-mono text-xs text-text-muted">{plan.inboundPlanId}</div>
                    </TableCell>
                    <TableCell className={CELL}>{plan.marketplaces.join(', ') || '—'}</TableCell>
                    <TableCell className={CELL}>
                      <PlanStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.shipmentCount) : '—'}</TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.units) : '—'}</TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.skus) : '—'}</TableCell>
                    <TableCell className={cn(CELL, 'font-mono text-xs')}>{plan.destinations.join(', ') || '—'}</TableCell>
                    <TableCell className={cn(CELL, 'text-sm text-text-muted')}>{plan.updatedAt ? formatDateTime(plan.updatedAt) : '—'}</TableCell>
                    <TableCell className={CELL}>
                      <RowActionsMenu
                        label={plan.name.trim() || plan.inboundPlanId}
                        items={[
                          { key: 'view', label: 'View details', onSelect: () => setOpenPlan(plan.inboundPlanId) },
                          {
                            key: 'refresh',
                            label: refreshingId === plan.inboundPlanId ? 'Refreshing…' : 'Refresh from Amazon',
                            disabled: refreshingId !== null || syncing,
                            onSelect: () => handleRefresh(plan.inboundPlanId, planTitle(plan.name)),
                          },
                          { key: 'copy', label: 'Copy plan ID', onSelect: () => handleCopy(plan.inboundPlanId) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="shipment plans"
          />
        )}
      </div>

      <PlanDetailModal planId={openPlan} onClose={() => setOpenPlan(null)} onNotify={notify} />
    </Container>
  )
}
