'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { NavIcons } from '@/components/navigation/icons'
import { Spinner } from '@/design-system/loaders'
import {
  AppNotification,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/services/api/notifications.api'
import { cn } from '@/utils/cn'

const PAGE_SIZE = 10

/** Bell with unread badge and a dropdown of the user's notifications. Live via the Notifications cache tag. */
export const NotificationBell: React.FC = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data: unread = 0 } = useGetUnreadCountQuery()
  const { data, isLoading, isFetching } = useGetNotificationsQuery({ page: 1, limit }, { skip: !open })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll] = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openNotification = (notification: AppNotification) => {
    if (!notification.readAt) void markRead(notification.id)
    setOpen(false)
    if (notification.link) router.push(notification.link)
  }

  const items = data?.data ?? []
  const hasMore = data ? data.totalRecords > items.length : false

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className="ds-icon-button relative"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {NavIcons.bell}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-text-inverse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
            <button
              type="button"
              disabled={unread === 0}
              onClick={() => markAll()}
              className="text-xs font-medium text-text-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-[calc(70vh-96px)] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-muted">You are all caught up.</p>
            ) : (
              <ul>
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary-50',
                        !notification.readAt && 'bg-secondary-50/70'
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', notification.readAt ? 'bg-transparent' : 'bg-danger-500')} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-text-primary">{notification.title}</span>
                        {notification.body && <span className="mt-0.5 block text-xs text-text-muted">{notification.body}</span>}
                        <span className="mt-1 block text-[11px] text-text-subtle">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasMore && (
            <button
              type="button"
              disabled={isFetching}
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
              className="w-full border-t border-border px-4 py-2.5 text-xs font-medium text-text-muted hover:bg-secondary-50 hover:text-text-primary disabled:opacity-50"
            >
              {isFetching ? 'Loading…' : 'Load older notifications'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
