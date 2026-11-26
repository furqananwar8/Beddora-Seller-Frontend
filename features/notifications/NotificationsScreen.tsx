'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Container } from '@/components/layout'
import { ListDateFilter } from '@/components/date-range-picker/ListDateFilter'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { FormField } from '@/components/form-field/FormField'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import {
  AppNotification,
  useGetNotificationFiltersQuery,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/services/api/notifications.api'
import { cn } from '@/utils/cn'
import { ANY_DATE, dateBounds } from '@/utils/dateRangeFilter'
import { notificationHref } from '@/utils/notificationLink'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 20

const TONES = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

/** Each notification type keeps one colour, so the list can be scanned by type. */
const categoryTone = (category: string): string => {
  let hash = 0
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

interface Filters {
  search: string
  categories: string[]
  actorIds: string[]
  unreadOnly: boolean
  dateRange: DateRangeValue
}

const NO_FILTERS: Filters = { search: '', categories: [], actorIds: [], unreadOnly: false, dateRange: ANY_DATE }

/** Columns are centered both ways, like the other list screens. */
const CELL = 'text-center align-middle'
const COLUMNS = ['', 'Notification', 'Message', 'Type', 'Created by', 'When']

/** Every notification the user has received, newest first, filterable by type, who triggered it, date and read state. */
export const NotificationsScreen: React.FC = () => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [pending, setPending] = useState<Filters>(NO_FILTERS)
  const [applied, setApplied] = useState<Filters>(NO_FILTERS)

  const { data: options } = useGetNotificationFiltersQuery()
  const { data: unread = 0 } = useGetUnreadCountQuery()
  const bounds = useMemo(() => dateBounds(applied.dateRange), [applied.dateRange])
  const { data, isLoading, isFetching, isError, refetch } = useGetNotificationsQuery({
    page,
    limit: pageSize,
    search: applied.search.trim() || undefined,
    categories: applied.categories,
    actorIds: applied.actorIds,
    unreadOnly: applied.unreadOnly,
    ...bounds,
  })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll] = useMarkAllNotificationsReadMutation()

  const apply = useCallback(() => {
    // Searching the same thing again changes nothing in the query, so ask the server explicitly
    if (JSON.stringify(pending) === JSON.stringify(applied) && page === 1) void refetch()
    setApplied(pending)
    setPage(1)
  }, [pending, applied, page, refetch])
  const reset = useCallback(() => {
    setPending(NO_FILTERS)
    setApplied(NO_FILTERS)
    setPage(1)
  }, [])

  const open = (notification: AppNotification) => {
    if (!notification.readAt) void markRead(notification.id)
    const href = notificationHref(notification)
    if (href) router.push(href)
  }

  const rows = data?.data ?? []
  const dirty = JSON.stringify(pending) !== JSON.stringify(applied)
  const activeCount = (Object.keys(pending) as Array<keyof Filters>).filter((key) => JSON.stringify(pending[key]) !== JSON.stringify(NO_FILTERS[key])).length
  const categoryOptions = useMemo(() => (options?.categories ?? []).map((category) => ({ value: category.id, label: category.name })), [options])
  const actorOptions = useMemo(() => (options?.actors ?? []).map((actor) => ({ value: actor.id, label: actor.name })), [options])

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Notifications</h1>
          <p className="text-sm text-text-muted">Everything sent to you, newest first. Open one to go to the record it is about.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={unread === 0} onClick={() => markAll()}>
          Mark all as read{unread > 0 ? ` (${unread})` : ''}
        </Button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={dirty ? 1 : 0} activeCount={activeCount} onApply={apply} onReset={reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="notification-search">
              <input
                id="notification-search"
                type="search"
                value={pending.search}
                onChange={(event) => setPending((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Title or message"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Type" htmlFor="notification-type">
              <FilterMultiSelect id="notification-type" options={categoryOptions} value={pending.categories} onChange={(categories) => setPending((prev) => ({ ...prev, categories }))} anyLabel="All types" />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Created by" htmlFor="notification-actor">
              <FilterMultiSelect id="notification-actor" options={actorOptions} value={pending.actorIds} onChange={(actorIds) => setPending((prev) => ({ ...prev, actorIds }))} anyLabel="All users" />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Status" htmlFor="notification-status">
              <FilterMultiSelect
                id="notification-status"
                options={[{ value: 'unread', label: 'Unread only' }]}
                value={pending.unreadOnly ? ['unread'] : []}
                onChange={(value) => setPending((prev) => ({ ...prev, unreadOnly: value.includes('unread') }))}
                anyLabel="Read and unread"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Date">
              <ListDateFilter value={pending.dateRange} onApply={(dateRange) => setPending((prev) => ({ ...prev, dateRange }))} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm font-medium text-danger-600">Could not load notifications.</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">No notifications match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full" wrapperClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((title, index) => (
                    <TableHead key={index} className={cn(CELL, index === 0 && 'w-8')}>
                      {title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((notification) => (
                  <TableRow key={notification.id} onClick={() => open(notification)} className={cn('cursor-pointer hover:bg-secondary-50', !notification.readAt && 'bg-secondary-50/70')}>
                    <TableCell className={CELL}>
                      <span className={cn('inline-block h-2 w-2 rounded-full', notification.readAt ? 'bg-transparent' : 'bg-danger-500')} aria-label={notification.readAt ? 'Read' : 'Unread'} />
                    </TableCell>
                    <TableCell className={cn(CELL, 'max-w-xs')}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); open(notification) }} className={cn('max-w-full truncate text-sm text-text-primary hover:underline', notification.readAt ? 'font-medium' : 'font-semibold')} title={notification.title}>
                        {notification.title}
                      </button>
                    </TableCell>
                    <TableCell className={cn(CELL, 'max-w-sm truncate text-xs text-text-muted')} title={notification.body ?? undefined}>
                      {notification.body ? notification.body.split('\n').filter(Boolean).join('  ·  ') : '—'}
                    </TableCell>
                    <TableCell className={CELL}>
                      <span className={cn('inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', categoryTone(notification.category))}>{notification.categoryLabel ?? notification.category}</span>
                    </TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap text-xs text-text-secondary')}>{notification.actor?.name ?? '—'}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap text-xs text-text-subtle')}>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && (
          <PaginationFooter selectablePageSize page={data.page} pageSize={pageSize} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="notifications" />
        )}
      </div>
    </Container>
  )
}
