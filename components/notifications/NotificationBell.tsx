'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelTop, setPanelTop] = useState(64)
  const [panelRight, setPanelRight] = useState(12)

  const { data: unread = 0 } = useGetUnreadCountQuery()
  const { data, isLoading, isFetching } = useGetNotificationsQuery({ page: 1, limit })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll] = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // The panel is portalled to <body> so no sticky table header or other stacking context can cover it.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return
    const place = () => {
      const rect = wrapperRef.current!.getBoundingClientRect()
      setPanelTop(rect.bottom + 8)
      setPanelRight(Math.max(12, window.innerWidth - rect.right))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
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
        className="relative p-2 text-text-muted focus:outline-none"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="block [&>svg]:h-6 [&>svg]:w-6">{NavIcons.bell}</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 ds-circle flex h-5 min-w-[20px] items-center justify-center bg-danger-600 px-1 text-[11px] font-bold leading-none text-text-inverse ring-2 ring-surface">
            {unread > 10 ? '10+' : unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
        <div
          ref={panelRef}
          style={{ top: panelTop, right: panelRight }}
          className="fixed z-[9500] max-h-[70vh] w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:w-96"
        >
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

          <div className="max-h-[360px] overflow-y-auto">
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
                        {notification.body && <span className="mt-0.5 block whitespace-pre-line text-xs text-text-muted">{notification.body}</span>}
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
        </div>,
        document.body
      )}
    </div>
  )
}
