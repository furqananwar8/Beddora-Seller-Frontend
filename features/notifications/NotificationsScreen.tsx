'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Container } from '@/components/layout'
import { ListDateFilter } from '@/components/date-range-picker/ListDateFilter'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
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

/** Every notification the user has received, newest first, filterable by type, who triggered it, date and read state. */
export const NotificationsScreen: React.FC = () => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Filters>(NO_FILTERS)
  const [applied, setApplied] = useState<Filters>(NO_FILTERS)

  const { data: options } = useGetNotificationFiltersQuery()
  const { data: unread = 0 } = useGetUnreadCountQuery()
  const bounds = useMemo(() => dateBounds(applied.dateRange), [applied.dateRange])
  const { data, isLoading, isFetching, isError } = useGetNotificationsQuery({
    page,
    limit: PAGE_SIZE,
    search: applied.search.trim() || undefined,
    categories: applied.categories,
    actorIds: applied.actorIds,
    unreadOnly: applied.unreadOnly,
    ...bounds,
  })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll] = useMarkAllNotificationsReadMutation()

  const apply = useCallback(() => {
    setApplied(pending)
    setPage(1)
  }, [pending])
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
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full min-w-0 sm:w-64">
            <span className="ds-input-label">Search</span>
            <input
              type="search"
              value={pending.search}
              onChange={(event) => setPending((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Title or message"
              className="ds-input ds-input-default rounded-lg"
              aria-label="Search notifications"
            />
          </div>
          <MultiSelectInput
            title="Type"
            options={options?.categories ?? []}
            value={pending.categories}
            onChange={(categories) => setPending((prev) => ({ ...prev, categories }))}
            placeholder="All types"
          />
          <MultiSelectInput
            title="Created by"
            options={options?.actors ?? []}
            value={pending.actorIds}
            onChange={(actorIds) => setPending((prev) => ({ ...prev, actorIds }))}
            placeholder="All users"
            allLabel="All users"
          />
          <MultiSelectInput
            title="Status"
            single
            options={[{ id: 'unread', name: 'Unread only' }]}
            value={pending.unreadOnly ? ['unread'] : []}
            onChange={(value) => setPending((prev) => ({ ...prev, unreadOnly: value.includes('unread') }))}
            placeholder="Read and unread"
          />
          <ListDateFilter value={pending.dateRange} onApply={(dateRange) => setPending((prev) => ({ ...prev, dateRange }))} />
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button type="button" variant="primary" disabled={!dirty} onClick={apply}>
              Apply filters
            </Button>
          </div>
        </div>
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
          <ul>
            {rows.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => open(notification)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-secondary-50',
                    !notification.readAt && 'bg-secondary-50/70'
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', notification.readAt ? 'bg-transparent' : 'bg-danger-500')} aria-label={notification.readAt ? 'Read' : 'Unread'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate text-sm text-text-primary', notification.readAt ? 'font-medium' : 'font-semibold')}>{notification.title}</span>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', categoryTone(notification.category))}>
                        {notification.categoryLabel ?? notification.category}
                      </span>
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block truncate text-xs text-text-muted">{notification.body.split('\n').filter(Boolean).join('  ·  ')}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-[11px] leading-tight text-text-subtle">
                    <span className="block whitespace-nowrap">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                    {notification.actor && <span className="mt-0.5 block max-w-[140px] truncate">{notification.actor.name}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {data && (
          <PaginationFooter page={data.page} pageSize={PAGE_SIZE} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="notifications" />
        )}
      </div>
    </Container>
  )
}
