import React from 'react'
import { shortDateTime } from '../shippingMeta'
import type { TrackingEvent } from '../types'

interface TrackingTimelineProps {
  /** Newest first. */
  events: TrackingEvent[]
  /** Shown when there are no events. */
  emptyText?: string
}

/** Carrier scans as a vertical timeline, the latest highlighted. */
export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({ events, emptyText = 'No carrier scans yet.' }) =>
  events.length === 0 ? (
    <p className="text-sm text-text-muted">{emptyText}</p>
  ) : (
    <ol className="relative ml-1.5 space-y-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={`${event.occurredAt}-${index}`} className="relative">
          <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface ${index === 0 ? 'bg-primary-600' : 'bg-secondary-300'}`} />
          <b className="text-sm text-text-primary">{event.description || event.statusLabel}</b>
          <div className="text-xs text-text-muted">{[event.location, shortDateTime(event.occurredAt)].filter(Boolean).join(' · ')}</div>
        </li>
      ))}
    </ol>
  )
