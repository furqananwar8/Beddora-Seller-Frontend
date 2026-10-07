'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface PanelProps {
  title: string
  /** Shown as a pill next to the title, e.g. how many items the panel lists. */
  count?: number
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** One titled column of the container page. */
export const Panel: React.FC<PanelProps> = ({ title, count, action, className, children }) => (
  <section className={cn('flex min-w-0 flex-col rounded-lg border border-border bg-surface shadow-sm', className)}>
    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-primary">
        {title}
        {count !== undefined && <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium normal-case text-secondary-700">{count}</span>}
      </h2>
      {action}
    </header>
    <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
  </section>
)

/** An empty panel's message. */
export const PanelEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-6 text-center text-sm text-text-muted">{children}</p>

/** A label over a value, for compact facts inside cards. */
export const Fact: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={cn('min-w-0', className)}>
    <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
    <p className="truncate text-sm text-text-primary">{children ?? '—'}</p>
  </div>
)
