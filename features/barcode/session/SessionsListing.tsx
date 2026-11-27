'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { FormField } from '@/components/form-field/FormField'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { NewTabLink } from '@/components/new-tab-link/NewTabLink'
import { orderSearchHref } from '@/features/shipping/shippingMeta'
import { RECEIVING_ROUTES } from '@/features/inventory/inbound-receiving/routes'
import { Spinner } from '@/design-system/loaders'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { useGetScanSessionsQuery, useGetScanSessionStatsQuery, useGetScanStartersQuery, type ScanSessionFilters, type ScanSessionSummary } from '@/services/api/barcode.api'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { CHANNEL_LABEL, SOURCE_LABEL, channelName, sessionCode } from './scanSession'
import { StatusChip } from './StatusChip'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { usePageSize } from '@/hooks/usePageSize'

const PAGE_SIZE = 10
/** Sessions end and start all day; the listing keeps up without a reload. */
const REFRESH_MS = 15_000

interface Draft {
  search: string
  scenario: string[]
  channel: string[]
  status: string[]
  direction: string[]
  from: string
  to: string
  startedBy: string[]
}
const EMPTY: Draft = { search: '', scenario: [], channel: [], status: [], direction: [], from: '', to: '', startedBy: [] }

const SOURCE_OPTIONS: FilterOption[] = Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label: value === 'CONTAINER' ? 'Inbound receiving' : value === 'FBM_ORDER' ? 'Shipping order' : label }))
const CHANNEL_OPTIONS: FilterOption[] = Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS: FilterOption[] = [
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'COMPLETED_UNMATCHED', label: 'Completed with unmatched' },
  { value: 'DISCARDED', label: 'Discarded' },
]
const DIRECTION_OPTIONS: FilterOption[] = [
  { value: 'OUT', label: 'Out' },
  { value: 'IN', label: 'In' },
]

const toFilters = (d: Draft): ScanSessionFilters & { search?: string } => ({
  ...(d.search.trim() ? { search: d.search.trim() } : {}),
  ...(d.scenario.length ? { scenario: d.scenario as ScanSessionFilters['scenario'] } : {}),
  ...(d.channel.length ? { channel: d.channel } : {}),
  ...(d.status.length ? { status: d.status as ScanSessionFilters['status'] } : {}),
  ...(d.direction.length ? { direction: d.direction as ScanSessionFilters['direction'] } : {}),
  ...(d.from ? { from: d.from } : {}),
  ...(d.to ? { to: d.to } : {}),
  ...(d.startedBy.length ? { startedBy: d.startedBy.map(Number) } : {}),
})

/** The page of the record a session scanned, so its source can be opened and checked. */
function sourceHref(s: Pick<ScanSessionSummary, 'scenario' | 'sourceId'>): string {
  if (s.scenario === 'CONTAINER') return RECEIVING_ROUTES.update(s.sourceId)
  if (s.scenario === 'FBA_WFS') return `/dashboard/inventory/shipments?search=${encodeURIComponent(`SHP-${s.sourceId.padStart(4, '0')}`)}`
  // an order's id is channel:market:orderId
  return orderSearchHref(s.sourceId.split(':').slice(2).join(':'))
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-')

/** The Barcode screen's session listing: filters take effect when Apply filters is pressed. */
export function SessionsListing() {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [applied, setApplied] = useState<Draft>(EMPTY)
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const { data: stats, refetch: refetchStats } = useGetScanSessionStatsQuery(undefined, { pollingInterval: REFRESH_MS })
  const { data: users, isLoading: usersLoading } = useGetScanStartersQuery()
  const starterOptions: FilterOption[] = (users ?? []).map((u) => ({ value: String(u.id), label: u.name ?? `User ${u.id}` }))
  const { data, isFetching, refetch } = useGetScanSessionsQuery({ page, limit: pageSize, ...toFilters(applied) }, { pollingInterval: REFRESH_MS })
  // A session started, scanned or ended anywhere shows up right away; the polling above is only the fallback
  useRealtime('barcode.scan-session', () => {
    void refetch()
    void refetchStats()
  })

  const apply = () => {
    setApplied(draft)
    setPage(1)
  }
  const reset = () => {
    setDraft(EMPTY)
    setApplied(EMPTY)
    setPage(1)
  }

  const cards: Array<[string, string | number, string]> = [
    ['Sessions (last 7 days)', stats?.sessions ?? '-', stats ? `${stats.inProgress} in progress` : ''],
    ['UPCs matched', stats ? stats.matched.toLocaleString() : '-', stats ? `${stats.matchedPercent}% of scans` : ''],
    ['UPCs not matched', stats?.notMatched ?? '-', 'Fix the product UPC, then scan again'],
    ['Units adjusted in inventory', stats ? stats.unitsAdjusted.toLocaleString() : '-', stats ? `${stats.unitsOut.toLocaleString()} out · ${stats.unitsIn.toLocaleString()} in` : ''],
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-text-muted">{label}</div>
              <div className="mt-1 text-3xl font-bold text-text-primary">{value}</div>
              <div className="mt-0.5 text-xs text-text-muted">{note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-1">
              <Input label="Search" placeholder="Session ID, shipment / order / receiving no., or UPC" value={draft.search} onChange={(e) => set('search')(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} />
            </div>
            <FormField label="Source" htmlFor="scan-source">
              <FilterMultiSelect id="scan-source" options={SOURCE_OPTIONS} value={draft.scenario} onChange={set('scenario')} anyLabel="All sources" highlighted={draft.scenario.join() !== applied.scenario.join()} />
            </FormField>
            <FormField label="Channel" htmlFor="scan-channel">
              <FilterMultiSelect id="scan-channel" options={CHANNEL_OPTIONS} value={draft.channel} onChange={set('channel')} anyLabel="All channels" highlighted={draft.channel.join() !== applied.channel.join()} />
            </FormField>
            <FormField label="Status" htmlFor="scan-status">
              <FilterMultiSelect id="scan-status" options={STATUS_OPTIONS} value={draft.status} onChange={set('status')} anyLabel="Any status" highlighted={draft.status.join() !== applied.status.join()} />
            </FormField>
            <FormField label="Inventory direction" htmlFor="scan-direction">
              <FilterMultiSelect id="scan-direction" options={DIRECTION_OPTIONS} value={draft.direction} onChange={set('direction')} anyLabel="In and out" highlighted={draft.direction.join() !== applied.direction.join()} />
            </FormField>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <Input label="From" type="date" value={draft.from} onChange={(e) => set('from')(e.target.value)} />
              </div>
              <div className="w-48">
                <Input label="To" type="date" value={draft.to} onChange={(e) => set('to')(e.target.value)} />
              </div>
              <div className="w-56">
                <FormField label="Started by" htmlFor="scan-started-by">
                  <FilterMultiSelect id="scan-started-by" options={starterOptions} value={draft.startedBy} onChange={set('startedBy')} anyLabel="Anyone" loading={usersLoading} highlighted={draft.startedBy.join() !== applied.startedBy.join()} />
                </FormField>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button onClick={apply}>Apply filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!data ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : data.data.length === 0 ? (
            <p className="p-10 text-center text-text-muted">No scan sessions match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-100 text-center text-xs text-secondary-600">
                  <tr>
                    {['Session', 'Source', 'Channel', 'Started by', 'Started', 'Ended'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3.5 py-3 text-center align-middle font-semibold">
                        {h}
                      </th>
                    ))}
                    {['Scanned', 'Matched', 'Not matched', 'Units adjusted'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3.5 py-3 text-center align-middle font-semibold">
                        {h}
                      </th>
                    ))}
                    <th className="px-3.5 py-3 text-center font-semibold align-middle">Direction</th>
                    <th className="px-3.5 py-3 text-center font-semibold align-middle">Status</th>
                    <th className="px-3.5 py-3 text-center font-semibold align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((s) => {
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-3.5 py-3.5 text-center font-mono text-xs align-middle">{sessionCode(s.id)}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">
                          <NewTabLink href={sourceHref(s)} title="Open the scanned record in a new tab" className="block">
                            <div className="font-bold">{SOURCE_LABEL[s.scenario]}</div>
                            <div className="break-all text-xs">{s.ref}</div>
                          </NewTabLink>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">{channelName(s.channel)}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">{s.startedBy.name ?? '-'}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">{when(s.startedAt)}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">{when(s.endedAt)}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.scanned}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.matched}</td>
                        <td className={`px-3.5 py-3.5 text-center align-middle ${s.notMatched > 0 ? 'font-semibold text-warning-700' : ''}`}>{s.notMatched}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.status === 'COMPLETED' ? s.unitsApplied : '-'}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">
                          <Badge variant={s.direction === 'IN' ? 'success' : 'warning'} size="sm">
                            {s.direction}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">
                          <StatusChip session={s} />
                        </td>
                        <td className="px-3.5 py-3.5 text-center align-middle">
                          <RowActionsMenu
                            label={`session ${sessionCode(s.id)}`}
                            items={[{ key: 'open', label: s.status === 'IN_PROGRESS' ? 'Open' : 'View', onSelect: () => router.push(`/dashboard/barcode/session/${s.id}`) }]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data && <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="sessions" />}
        </CardContent>
      </Card>
    </div>
  )
}
