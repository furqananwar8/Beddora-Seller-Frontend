'use client'

import React from 'react'
import { useAppDispatch } from '@/store/hooks'
import { toggleSidebar } from '@/store/ui.slice'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface FinanceScreenBarProps {
  /** Breadcrumb trail, last item is the current screen. */
  trail: string[]
  searchPlaceholder: string
  search: string
  onSearchChange: (value: string) => void
}

/**
 * Replaces the global header on finance screens: breadcrumb, the screen's own
 * search, and the notification bell. The menu button keeps the sidebar
 * reachable on phones, where the global header used to provide it.
 */
export const FinanceScreenBar: React.FC<FinanceScreenBarProps> = ({ trail, searchPlaceholder, search, onSearchChange }) => {
  const dispatch = useAppDispatch()

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-6">
      <button type="button" className="ds-icon-button lg:hidden" aria-label="Toggle sidebar" onClick={() => dispatch(toggleSidebar())}>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-sm text-text-muted">
        {trail.map((part, index) => (
          <span key={part}>
            {index > 0 && <span className="mx-1.5">/</span>}
            <span className={index === trail.length - 1 ? 'font-semibold text-text-primary' : undefined}>{part}</span>
          </span>
        ))}
      </nav>

      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="order-last w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 sm:order-none sm:w-72"
      />

      <NotificationBell />
    </div>
  )
}
