"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { Container } from '@/components/layout'
import DateRangePicker, { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Tabs } from '@/design-system/tabs/Tabs'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { cn } from '@/utils/cn'
import { useGetShipmentsConfigQuery } from '@/services/api/inboundShipments.api'
import {
  SellerCentralChannel,
  SellerCentralSyncStatuses,
  useGetSellerCentralSyncStatusQuery,
  useStartSellerCentralSyncMutation,
} from '@/services/api/sellerCentralShipments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { CONTROL } from './ListToolbar'
import { Notify, n } from './panel'
import { PLATFORMS } from './platforms'

/** How often to ask the server whether a sync has ended, in case the live event never arrives. */
const SYNC_POLL_MS = 5000

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

const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ id: p.id, name: p.label }))
const labelOf = (id: SellerCentralChannel) => PLATFORMS.find((p) => p.id === id)?.label ?? id

/** What the last sync of one platform found, in a few words. */
function lastSyncNote(id: SellerCentralChannel, statuses?: SellerCentralSyncStatuses): string | null {
  const status = statuses?.[id]
  if (status?.error) return `${labelOf(id)} failed: ${status.error}`
  const result = status?.result
  if (!result) return null
  return `${labelOf(id)}: ${n(result.added)} new, ${n(result.detailed)} updated${result.failed ? `, ${n(result.failed)} couldn’t be read` : ''}`
}

export const SellerCentralScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const [viewing, setViewing] = useState<SellerCentralChannel>('amazon_fba')
  // Which platforms the next sync pulls; both unless the user narrows it
  const [chosen, setChosen] = useState<SellerCentralChannel[]>(() => PLATFORMS.map((p) => p.id))
  const [range, setRange] = useState<DateRangeValue>(() => ({ ...lastDays(30), presetId: '30' }))
  // Presets apply at once; dates picked on the calendar only count after Apply is pressed
  const [applied, setApplied] = useState(true)
  const presets = useMemo(() => syncPresets(range), [range])

  const { data: config } = useGetShipmentsConfigQuery()

  // The syncs run on the server; their end arrives as a live event that refreshes the lists
  const [pollMs, setPollMs] = useState(0)
  const { data: statuses } = useGetSellerCentralSyncStatusQuery(undefined, { pollingInterval: pollMs })
  const [startSync, { isLoading: starting }] = useStartSellerCentralSyncMutation()
  const running = (id: SellerCentralChannel) => Boolean(statuses?.[id]?.running)
  const anyRunning = PLATFORMS.some((p) => running(p.id))
  const syncing = starting || anyRunning
  useEffect(() => setPollMs(anyRunning ? SYNC_POLL_MS : 0), [anyRunning])

  const rangeDays = daysIn(range)
  const tooLong = rangeDays > MAX_SYNC_DAYS
  const rangeReady = rangeDays > 0 && !tooLong && applied && chosen.length > 0

  const notify: Notify = (message, type) => dispatch(addNotification({ message, type }))

  const handleSync = async () => {
    if (!range.startDate || !range.endDate || syncing || chosen.length === 0) return
    try {
      const response = await startSync({ from: range.startDate, to: range.endDate, channels: chosen }).unwrap()
      const startedNow = chosen.filter((id) => response[id]?.started)
      notify(
        startedNow.length > 0
          ? `Syncing ${startedNow.map(labelOf).join(' and ')}. It keeps running in the background, and we’ll tell you here when it’s done.`
          : 'A sync is already in progress.',
        'info'
      )
    } catch (err) {
      const timedOut = (err as { status?: string })?.status === 'TIMEOUT_ERROR'
      notify(timedOut ? 'The server didn’t answer in time. Check your connection and try again.' : apiErrorMessage(err, 'Could not start the sync'), 'error')
    }
  }

  const selected = rangeDays > 0 ? `${n(rangeDays)} day${rangeDays === 1 ? '' : 's'}` : null
  const runningNames = PLATFORMS.filter((p) => running(p.id)).map((p) => p.label)
  const runningRange = PLATFORMS.map((p) => statuses?.[p.id]).find((s) => s?.running)?.range
  const failed = PLATFORMS.some((p) => statuses?.[p.id]?.error)
  const notes = PLATFORMS.map((p) => lastSyncNote(p.id, statuses)).filter(Boolean)
  const statusLine = syncing
    ? `Syncing ${runningNames.join(' and ') || 'now'}${runningRange ? ` (${runningRange.from} to ${runningRange.to})` : ''}. You can leave this page; we’ll notify you when it’s done.`
    : tooLong
    ? `That’s ${n(rangeDays)} days. Pick at most ${MAX_SYNC_DAYS} days at a time.`
    : !applied && selected
    ? `${selected} chosen. Press Apply in the calendar to use these dates.`
    : chosen.length === 0
    ? 'Pick at least one platform to sync.'
    : [selected ? `${selected} selected` : 'Pick the days to sync', notes.length > 0 ? `last sync: ${notes.join(' · ')}` : 'never synced'].join(' · ')

  const channelSandbox = (id: SellerCentralChannel) => config?.channels?.find((c) => c.id === id)?.sandbox
  const sandboxNotes = [
    config?.sandbox && 'Amazon sandbox mode. Amazon’s sandbox holds no Seller Central shipments, so syncing finds nothing. Turn off FBA_SANDBOX to sync your real account.',
    channelSandbox('walmart_wfs') && 'Walmart sandbox mode. WFS_ENV points at Walmart’s sandbox, so only sample shipments come back. Set WFS_ENV=production to sync your real account.',
  ].filter(Boolean) as string[]

  const active = PLATFORMS.find((p) => p.id === viewing) ?? PLATFORMS[0]

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-4 px-1 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Platform shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            Shipments created on Amazon (Seller Central) and Walmart (Seller Center). Pick the platforms and days to sync, then open any shipment to see its details.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className={cn('w-full sm:w-[190px]', syncing && 'pointer-events-none opacity-60')} aria-disabled={syncing}>
              <MultiSelectInput
                title="Platform"
                allLabel="All platforms"
                options={PLATFORM_OPTIONS}
                value={chosen}
                minSelected={1}
                onChange={(value) => setChosen(value as SellerCentralChannel[])}
                className="w-full"
              />
            </div>
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
                'Sync'
              )}
            </Button>
          </div>
          <span className={cn('text-xs lg:text-right', tooLong || (!syncing && failed) ? 'text-danger-600' : 'text-text-muted')} aria-live="polite">
            {statusLine}
          </span>
        </div>
      </div>

      {sandboxNotes.map((note) => (
        <div key={note} className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {note}
        </div>
      ))}

      <div className="mb-4 overflow-x-auto">
        <Tabs
          size="md"
          activeTab={viewing}
          onChange={(id) => setViewing(id as SellerCentralChannel)}
          items={PLATFORMS.map((p) => ({ id: p.id, label: p.label }))}
          className="min-w-max"
        />
      </div>

      {/* Keyed so each platform keeps its own search, status and page while its tab is open */}
      <active.Panel key={active.id} syncing={running(active.id)} notify={notify} />
    </Container>
  )
}
