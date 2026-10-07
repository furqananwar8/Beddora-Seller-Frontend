'use client'

import React from 'react'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { PriceAnalysisEvent } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { cn } from '@/utils/cn'

const EVENT_DOT: Record<PriceAnalysisEvent['type'], string> = { APPROVED: 'bg-success-600', REJECTED: 'bg-danger-600', APPROVAL_CLEARED: 'bg-warning-500' }

const price = (event: PriceAnalysisEvent) => (event.unitPrice !== null && event.currency ? ` at ${formatCurrencyAmount(event.currency, event.unitPrice)}` : '')

/** "xyz was approved by xyz on date", rejections with their reason, and the edits that took an approval back, newest first. */
function describe(event: PriceAnalysisEvent, productLabel: string): string {
  const who = event.by.name ?? 'a teammate'
  const day = formatCalendarDay(event.at)
  if (event.type === 'APPROVED') return `${productLabel} was approved for ${event.supplierName ?? 'a supplier'}${price(event)} by ${who} on ${day}`
  if (event.type === 'REJECTED') return `${event.supplierName ?? 'A supplier'}'s quote${price(event)} for ${productLabel} was rejected by ${who} on ${day}`
  return `${productLabel} was edited by ${who} on ${day}; the approval of ${event.supplierName ?? 'a supplier'}${price(event)} was taken back and needs approving again`
}

/** The approval history of one analysis. */
export const ApprovalHistory: React.FC<{ events: PriceAnalysisEvent[]; productLabel: string }> = ({ events, productLabel }) =>
  events.length === 0 ? (
    <p className="py-4 text-center text-sm text-text-muted">No approvals or rejections yet.</p>
  ) : (
    <ol className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', EVENT_DOT[event.type])} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm text-text-primary">{describe(event, productLabel)}</p>
            {event.remarks && <p className="text-xs text-text-muted">{event.type === 'REJECTED' ? 'Reason' : 'Remarks'}: {event.remarks}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
