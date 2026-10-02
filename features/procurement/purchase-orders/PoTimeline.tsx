import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PoEvent } from '@/services/api/procurement.api'
import { formatDateTime } from '@/utils/format'

const LABEL: Record<string, string> = {
  CREATED: 'Created and sent for approval',
  UPDATED: 'Edited',
  RESUBMITTED: 'Edited after rejection, sent for approval again',
  APPROVED: 'Approved and locked',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

/** Who did what to this PO, oldest first. */
export const PoTimeline: React.FC<{ events: PoEvent[] }> = ({ events }) =>
  events.length === 0 ? null : (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-text-primary">
                  <span className="font-medium">{LABEL[event.type] ?? event.type}</span>
                  {event.actor?.name && <span className="text-text-muted"> · {event.actor.name}</span>}
                </p>
                {typeof event.payload?.reason === 'string' && <p className="text-text-secondary">“{event.payload.reason}”</p>}
                <p className="text-xs text-text-muted">{formatDateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
