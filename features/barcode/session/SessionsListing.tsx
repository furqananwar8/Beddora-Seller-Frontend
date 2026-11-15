'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { useGetScanSessionsQuery, useGetScanSessionStatsQuery, useGetScanStartersQuery, type ScanListStatus, type ScanSessionFilters } from '@/services/api/barcode.api'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { CHANNEL_LABEL, SOURCE_LABEL, channelName, sessionCode } from './scanSession'
import { StatusChip } from './StatusChip'

const PAGE_SIZE = 10
/** Sessions end and start all day; the listing keeps up without a reload. */
const REFRESH_MS = 15_000

interface Draft {
  search: string
  scenario: string
  channel: string
  status: string
  direction: string
  from: string
  to: string
  startedBy: string
}
const EMPTY: Draft = { search: '', scenario: '', channel: '', status: '', direction: '', from: '', to: '', startedBy: '' }

const toFilters = (d: Draft): ScanSessionFilters & { search?: string } => ({
  ...(d.search.trim() ? { search: d.search.trim() } : {}),
  ...(d.scenario ? { scenario: d.scenario as ScanSessionFilters['scenario'] } : {}),
  ...(d.channel ? { channel: d.channel } : {}),
  ...(d.status ? { status: d.status as ScanListStatus } : {}),
  ...(d.direction ? { direction: d.direction as ScanSessionFilters['direction'] } : {}),
  ...(d.from ? { from: d.from } : {}),
  ...(d.to ? { to: d.to } : {}),
  ...(d.startedBy ? { startedBy: Number(d.startedBy) } : {}),
})

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-')

/** The Barcode screen's session listing: filters take effect when Apply filters is pressed. */
export function SessionsListing() {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [applied, setApplied] = useState<Draft>(EMPTY)
  const [page, setPage] = useState(1)
  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))

  const { data: stats } = useGetScanSessionStatsQuery(undefined, { pollingInterval: REFRESH_MS })
  const { data: users } = useGetScanStartersQuery()
  const { data, isFetching } = useGetScanSessionsQuery({ page, limit: PAGE_SIZE, ...toFilters(applied) }, { pollingInterval: REFRESH_MS })

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
            <Select label="Source" value={draft.scenario} onChange={(e) => set('scenario')(e.target.value)} options={[{ value: '', label: 'All sources' }, ...Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label: value === 'CONTAINER' ? 'Inbound receiving' : value === 'FBM_ORDER' ? 'Shipping order' : label }))]} />
            <Select label="Channel" value={draft.channel} onChange={(e) => set('channel')(e.target.value)} options={[{ value: '', label: 'All channels' }, ...Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }))]} />
            <Select
              label="Status"
              value={draft.status}
              onChange={(e) => set('status')(e.target.value)}
              options={[
                { value: '', label: 'Any status' },
                { value: 'IN_PROGRESS', label: 'In progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'COMPLETED_UNMATCHED', label: 'Completed with unmatched' },
                { value: 'DISCARDED', label: 'Discarded' },
              ]}
            />
            <Select label="Inventory direction" value={draft.direction} onChange={(e) => set('direction')(e.target.value)} options={[{ value: '', label: 'In and out' }, { value: 'OUT', label: 'Out' }, { value: 'IN', label: 'In' }]} />
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
                <Select label="Started by" value={draft.startedBy} onChange={(e) => set('startedBy')(e.target.value)} options={[{ value: '', label: 'Anyone' }, ...(users ?? []).map((u) => ({ value: String(u.id), label: u.name ?? `User ${u.id}` }))]} />
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
                      <th key={h} className="whitespace-nowrap px-3.5 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                    {['Scanned', 'Matched', 'Not matched', 'Units adjusted'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3.5 py-3 text-center font-semibold">
                        {h}
                      </th>
                    ))}
                    <th className="px-3.5 py-3 font-semibold align-middle">Direction</th>
                    <th className="px-3.5 py-3 font-semibold align-middle">Status</th>
                    <th className="px-3.5 py-3 text-center font-semibold align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((s) => {
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-3.5 py-3.5 font-mono text-xs align-middle">{sessionCode(s.id)}</td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <div className="font-bold">{SOURCE_LABEL[s.scenario]}</div>
                          <div className="break-all text-xs text-text-muted">{s.ref}</div>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">{channelName(s.channel)}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">{s.startedBy.name ?? '-'}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">{when(s.startedAt)}</td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">{when(s.endedAt)}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.scanned}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.matched}</td>
                        <td className={`px-3.5 py-3.5 text-center ${s.notMatched > 0 ? 'font-semibold text-warning-700' : ''}`}>{s.notMatched}</td>
                        <td className="px-3.5 py-3.5 text-center align-middle">{s.status === 'COMPLETED' ? s.unitsApplied : '-'}</td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <Badge variant={s.direction === 'IN' ? 'success' : 'warning'} size="sm">
                            {s.direction}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">
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
          {data && data.totalRecords > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-text-muted">
              <span>
                Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.totalRecords)} of {data.totalRecords} sessions{isFetching ? ' · updating…' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
