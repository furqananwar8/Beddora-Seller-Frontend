import React from 'react'
import type { StatusTone } from '@/components/status-badge/StatusBadge'
import { cn } from '@/utils/cn'

const TONE_PILL: Record<StatusTone, string> = {
  neutral: 'bg-secondary-100 text-secondary-700',
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-warning-50 text-warning-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
}

/** A titled box, the same card look the other screens use for a filter bar or a section. */
export const Panel: React.FC<{ title?: string; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, subtitle, actions, className, children }) => (
  <section className={cn('rounded-lg border border-border bg-surface p-4 shadow-sm', className)}>
    {(title || actions) && (
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
)

/** The live activity list both tabs end with. */
export const ActivityFeed: React.FC<{ items: Array<{ id: number; at: number; kind: string; tone: StatusTone; text: string; topic: string; type: string }>; empty: string }> = ({ items, empty }) =>
  items.length === 0 ? (
    <p className="text-sm text-text-muted">{empty}</p>
  ) : (
    <ul className="max-h-80 space-y-0 overflow-auto">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 border-t border-border py-2 text-sm first:border-t-0">
          <span className="w-16 shrink-0 font-mono text-xs text-text-muted">{new Date(item.at).toLocaleTimeString('en-GB')}</span>
          <span className={cn('w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium', TONE_PILL[item.tone])}>{item.kind}</span>
          <div className="min-w-0 flex-1">
            <div className="text-text-primary">{item.text}</div>
            <div className="font-mono text-[11px] text-text-muted">
              {item.topic} · {item.type}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
