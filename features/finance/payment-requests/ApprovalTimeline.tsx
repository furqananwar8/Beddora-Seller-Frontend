import React, { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import type { RequestStatus, TimelineEvent } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'

interface Step {
  key: string
  title: string
  sub?: string
  glyph: string
  tone: string
}

const TONE = {
  done: 'bg-success-50 text-success-700',
  info: 'bg-sky-50 text-sky-700',
  danger: 'bg-danger-50 text-danger-700',
  neutral: 'bg-secondary-100 text-secondary-700',
  pending: 'bg-warning-50 text-warning-700',
}

const text = (payload: TimelineEvent['payload'], key: string): string | undefined => {
  const value = payload?.[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

const money = (payload: TimelineEvent['payload'], key: string): number | undefined => {
  const value = payload?.[key]
  return typeof value === 'number' ? value : undefined
}

const amountLine = (payload: TimelineEvent['payload'], key: string): string | undefined => {
  const value = money(payload, key)
  const currency = text(payload, 'currency')
  return value === undefined ? undefined : `${currency ?? ''} ${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim()
}

const stamp = (value: string) => format(new Date(value), 'dd MMM, HH:mm')

function toStep(event: TimelineEvent): Step {
  const by = event.actor?.name ?? 'system'
  const when = stamp(event.createdAt)
  const note = text(event.payload, 'note') ?? text(event.payload, 'reason')
  const withNote = (line: string) => (note ? `${line} · "${note}"` : line)

  switch (event.type) {
    case 'CREATED':
      return { key: String(event.id), title: 'Created', sub: `by ${by} · ${when}`, glyph: '+', tone: TONE.neutral }
    case 'SUBMITTED':
      return { key: String(event.id), title: 'Submitted', sub: `by ${by} · ${when}`, glyph: '✓', tone: TONE.done }
    case 'NOTIFIED':
      return {
        key: String(event.id),
        title: `Notified ${text(event.payload, 'name') ?? 'approver'}`,
        sub: `Email + in-app · ${when}`,
        glyph: '✉',
        tone: TONE.info,
      }
    case 'APPROVED':
      return { key: String(event.id), title: 'Approved', sub: withNote(`by ${by} · ${when}`), glyph: '✓', tone: TONE.done }
    case 'REJECTED':
      return { key: String(event.id), title: 'Rejected', sub: withNote(`by ${by} · ${when}`), glyph: '✕', tone: TONE.danger }
    case 'WITHDRAWN':
      return { key: String(event.id), title: 'Withdrawn', sub: `by ${by} · ${when}`, glyph: '↩', tone: TONE.neutral }
    case 'POP_ADDED': {
      const paid = amountLine(event.payload, 'amount')
      const left = money(event.payload, 'remaining')
      const lines = [
        paid ? `${paid} paid` : undefined,
        left !== undefined ? (left > 0 ? `${amountLine(event.payload, 'remaining')} remaining` : 'Fully covered') : undefined,
        `by ${by} · ${when}`,
      ]
      return { key: String(event.id), title: 'Proof of payment added', sub: lines.filter(Boolean).join('\n'), glyph: '$', tone: TONE.info }
    }
    case 'PAID': {
      const balance = money(event.payload, 'balance') ?? 0
      const paid = amountLine(event.payload, 'paidAmount')
      const total = amountLine(event.payload, 'amount')
      const lines = [
        paid && total ? `${paid} of ${total} paid` : undefined,
        paid && total ? (balance > 0 ? `${amountLine(event.payload, 'balance')} not paid` : 'Paid in full') : undefined,
        `by ${by} · ${when}`,
      ]
      return { key: String(event.id), title: balance > 0 ? 'Marked as paid (partial)' : 'Paid', sub: lines.filter(Boolean).join('\n'), glyph: '✓', tone: TONE.done }
    }

  }
}

/** Audit trail of the request; a trailing "awaiting decision" step shows while it is pending. */
export const ApprovalTimeline: React.FC<{ events: TimelineEvent[]; status: RequestStatus }> = ({ events, status }) => {
  const steps = events.map(toStep)
  if (status === 'PENDING_APPROVAL') {
    steps.push({ key: 'awaiting', title: 'Awaiting decision', sub: 'Approve or Reject', glyph: '…', tone: TONE.pending })
  }

  const scroller = useRef<HTMLDivElement>(null)
  const count = steps.length
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-4">
      <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.key} className="flex items-start gap-3">
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', step.tone)}>{step.glyph}</span>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-text-primary">{step.title}</p>
            {step.sub && <p className="whitespace-pre-line break-words text-xs text-text-muted">{step.sub}</p>}
          </div>
        </li>
      ))}
      </ol>
    </div>
  )
}
