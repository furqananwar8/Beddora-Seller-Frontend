'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { Container } from '@/components/layout'
import { ListDateFilter } from '@/components/date-range-picker/ListDateFilter'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { ActivityEntry, useGetActivityEntryQuery, useGetActivityFiltersQuery, useGetActivityQuery } from '@/services/api/activity.api'
import { cn } from '@/utils/cn'
import { ANY_DATE, dateBounds } from '@/utils/dateRangeFilter'

const PAGE_SIZE = 50

interface Filters {
  search: string
  userIds: string[]
  screens: string[]
  actions: string[]
  dateRange: DateRangeValue
}

const NO_FILTERS: Filters = { search: '', userIds: [], screens: [], actions: [], dateRange: ANY_DATE }

const dayLabel = (date: Date) => (isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'EEEE')) + ` · ${format(date, 'd MMM yyyy')}`

/** Groups newest-first entries by calendar day, keeping the order. */
function groupByDay(entries: ActivityEntry[]): Array<{ key: string; label: string; entries: ActivityEntry[] }> {
  const groups: Array<{ key: string; label: string; entries: ActivityEntry[] }> = []
  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    const key = format(date, 'yyyy-MM-dd')
    const last = groups[groups.length - 1]
    if (last?.key === key) last.entries.push(entry)
    else groups.push({ key, label: dayLabel(date), entries: [entry] })
  }
  return groups
}

const ACTION_VARIANT: Record<string, 'success' | 'error' | 'primary' | 'secondary'> = { Create: 'success', Delete: 'error', Update: 'primary' }

/** Admin timeline: every successful create/update/delete, grouped by day, newest first. Click an entry for its details. */
export const ActivityScreen: React.FC = () => {
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Filters>(NO_FILTERS)
  const [applied, setApplied] = useState<Filters>(NO_FILTERS)
  const [openId, setOpenId] = useState<number | null>(null)

  const { data: options } = useGetActivityFiltersQuery()
  const bounds = useMemo(() => dateBounds(applied.dateRange), [applied.dateRange])
  const { data, isLoading, isFetching, isError, error } = useGetActivityQuery({
    page,
    limit: PAGE_SIZE,
    search: applied.search.trim() || undefined,
    userIds: applied.userIds,
    screens: applied.screens,
    actions: applied.actions,
    ...bounds,
  })

  const apply = useCallback(() => {
    setApplied(pending)
    setPage(1)
  }, [pending])
  const reset = useCallback(() => {
    setPending(NO_FILTERS)
    setApplied(NO_FILTERS)
    setPage(1)
  }, [])

  const groups = useMemo(() => groupByDay(data?.data ?? []), [data])
  const dirty = JSON.stringify(pending) !== JSON.stringify(applied)
  const forbidden = isError && (error as { status?: number } | undefined)?.status === 403

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Activity timeline</h1>
        <p className="text-sm text-text-muted">Who did what, on which screen, day by day. Select an entry to see its details.</p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full min-w-0 sm:w-64">
            <span className="ds-input-label">Search</span>
            <input
              type="search"
              value={pending.search}
              onChange={(event) => setPending((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Action, record or path"
              className="ds-input ds-input-default rounded-lg"
              aria-label="Search activity"
            />
          </div>
          <MultiSelectInput title="User" options={options?.users ?? []} value={pending.userIds} onChange={(userIds) => setPending((prev) => ({ ...prev, userIds }))} placeholder="All users" allLabel="All users" />
          <MultiSelectInput title="Screen" options={options?.screens ?? []} value={pending.screens} onChange={(screens) => setPending((prev) => ({ ...prev, screens }))} placeholder="All screens" allLabel="All screens" />
          <MultiSelectInput title="Action" options={options?.actions ?? []} value={pending.actions} onChange={(actions) => setPending((prev) => ({ ...prev, actions }))} placeholder="All actions" allLabel="All actions" />
          <ListDateFilter value={pending.dateRange} onApply={(dateRange) => setPending((prev) => ({ ...prev, dateRange }))} />
          <Button type="button" variant="primary" disabled={!dirty} onClick={apply}>
            Filter
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : forbidden ? (
          <p className="py-16 text-center text-sm font-medium text-danger-600">Only administrators can see the activity timeline.</p>
        ) : isError ? (
          <p className="py-16 text-center text-sm font-medium text-danger-600">Could not load activity.</p>
        ) : groups.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">No activity matches these filters.</p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <h2 className="sticky top-0 z-[1] border-b border-border bg-secondary-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {group.label} · {group.entries.length} {group.entries.length === 1 ? 'action' : 'actions'}
              </h2>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(entry.id)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary-50"
                    >
                      <span className="w-16 shrink-0 text-xs tabular-nums text-text-muted">{format(new Date(entry.createdAt), 'HH:mm:ss')}</span>
                      <Badge variant={ACTION_VARIANT[entry.action] ?? 'secondary'} size="sm">
                        {entry.action}
                      </Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-primary">
                          <strong className="font-semibold">{entry.user?.name ?? 'System'}</strong> · {entry.summary}
                        </span>
                        <span className="block text-xs text-text-muted">{entry.screen}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {data && <PaginationFooter page={data.page} pageSize={PAGE_SIZE} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="actions" />}
      </div>

      <ActivityDetailModal id={openId} onClose={() => setOpenId(null)} />
    </Container>
  )
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-3 border-b border-border py-2 text-sm last:border-b-0">
    <dt className="text-text-muted">{label}</dt>
    <dd className="col-span-2 break-words text-text-primary">{children}</dd>
  </div>
)

const ActivityDetailModal: React.FC<{ id: number | null; onClose: () => void }> = ({ id, onClose }) => {
  const { data: entry, isFetching } = useGetActivityEntryQuery(id ?? 0, { skip: id === null })
  return (
    <Modal isOpen={id !== null} onClose={onClose} title="Activity details" size="md" closeOnBackdropClick closeOnEscape>
      {isFetching || !entry ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <dl>
          <Field label="Who">{entry.user?.name ?? 'System'}</Field>
          <Field label="When">{format(new Date(entry.createdAt), 'EEE d MMM yyyy, HH:mm:ss')}</Field>
          <Field label="Screen">{entry.screen}</Field>
          <Field label="Action">{entry.summary}</Field>
          {entry.entityType && (
            <Field label="Record">
              {entry.entityType}
              {entry.entityId ? ` #${entry.entityId}` : ''}
            </Field>
          )}
          {entry.metadata?.changedFields && entry.metadata.changedFields.length > 0 && <Field label="Fields sent">{entry.metadata.changedFields.join(', ')}</Field>}
        </dl>
      )}
    </Modal>
  )
}
