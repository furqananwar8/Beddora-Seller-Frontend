'use client'

import React, { useState } from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import type { PoApproval, PoApprovalStep, PurchaseOrderDetail } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'

interface ApprovalPanelProps {
  po: PurchaseOrderDetail
  busy: 'approve' | 'reject' | null
  onApprove: () => void
  onReject: (reason: string) => void
}

type StepState = PoApproval['steps'][number]['state'] | 'SUBMITTED' | 'FINAL'

const DOT: Record<StepState, string> = {
  SUBMITTED: 'bg-success-500 text-white',
  DONE: 'bg-success-500 text-white',
  CURRENT: 'bg-warning-500 text-white',
  WAITING: 'bg-secondary-200 text-text-muted',
  REJECTED: 'bg-danger-500 text-white',
  FINAL: 'bg-secondary-200 text-text-muted',
}

const Check = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </svg>
)

/** One stop on the line: a dot, a title and up to two lines under it. */
const Stop: React.FC<{ state: StepState; mark?: React.ReactNode; title: string; lines: React.ReactNode[] }> = ({ state, mark, title, lines }) => (
  <li className="flex w-44 shrink-0 flex-col items-center text-center">
    <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', DOT[state])}>{mark ?? <Check />}</span>
    <span className={cn('mt-2 text-sm font-semibold', state === 'WAITING' || state === 'FINAL' ? 'text-text-muted' : 'text-text-primary')}>{title}</span>
    {lines.map((line, index) => (
      <span key={index} className={cn('text-xs', state === 'CURRENT' && index === 0 ? 'text-warning-700' : 'text-text-muted')}>
        {line}
      </span>
    ))}
  </li>
)

/** The line between two stops: solid once passed, dashed while still ahead. */
const Link: React.FC<{ passed: boolean }> = ({ passed }) => <li aria-hidden className={cn('mt-3.5 h-0 min-w-8 flex-1 border-t-2', passed ? 'border-solid border-success-500' : 'border-dashed border-border')} />

const decidedOn = (people: PoApprovalStep['people']) => {
  const times = people.filter((person) => person.status === 'APPROVED' && person.decidedAt).map((person) => person.decidedAt as string)
  return times.length ? formatCalendarDay(times.sort().at(-1)!) : null
}

function stepStop(step: PoApprovalStep) {
  const names = step.people.length > 0 ? step.people.map((person) => person.name) : step.labels
  const title = names.map((name) => (step.people.length > 0 ? name.split(' ')[0] : name)).join(' + ')
  const approved = step.people.filter((person) => person.status === 'APPROVED').length
  if (step.state === 'DONE') return { title, lines: [`approved${decidedOn(step.people) ? ` ${decidedOn(step.people)}` : ''}`] }
  if (step.state === 'REJECTED') return { title, lines: ['rejected'] }
  if (step.state === 'WAITING') return { title, lines: ['waiting for step ' + (step.position - 1)] }
  const progress = step.completion === 'ANY' ? 'waiting · any one approves' : `waiting · ${approved} of ${step.people.length} approved`
  return { title, lines: [progress] }
}

/** The approval chain as a line: submitted, each step in order, approved. */
const ApprovalSteps: React.FC<{ approval: PoApproval; createdBy: string; createdAt: string }> = ({ approval, createdBy, createdAt }) => (
  <div className="mt-4 overflow-x-auto pb-1">
    <ol className="flex min-w-max items-start">
      <Stop state="SUBMITTED" title="Submitted" lines={[createdBy, formatCalendarDay(createdAt)]} />
      {approval.steps.map((step) => {
        const { title, lines } = stepStop(step)
        const previous = approval.steps.find((candidate) => candidate.position === step.position - 1)
        return (
          <React.Fragment key={step.position}>
            <Link passed={step.position === 1 || previous?.state === 'DONE'} />
            <Stop state={step.state} mark={step.state === 'DONE' ? undefined : step.state === 'REJECTED' ? '✕' : step.position} title={title} lines={lines} />
          </React.Fragment>
        )
      })}
      <Link passed={approval.steps.every((step) => step.state === 'DONE')} />
      <Stop state="FINAL" mark="" title="Approved" lines={[]} />
    </ol>
  </div>
)

/** Shown while pending approval: approvers decide here, everyone else sees that it is waiting. */
export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ po, busy, onApprove, onReject }) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reject = () => {
    if (reason.trim().length < 3) return setError('A reason is required to reject')
    setError(null)
    onReject(reason.trim())
  }

  return (
    <section aria-labelledby="approval-title" className="rounded-lg border border-warning-200 bg-warning-50/70 p-4 sm:p-5">
      {po.rejectionReason && (
        <p role="alert" className="mb-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          <strong>Rejected by {po.decidedBy?.name ?? 'an approver'}:</strong> “{po.rejectionReason}”. Update the PO and save to send it for approval again.
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="approval-title" className="font-semibold text-text-primary">
            {po.can.decide ? 'Awaiting admin approval' : 'Awaiting approval'}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Submitted {formatCalendarDay(po.createdAt)} by {po.createdBy.name ?? 'someone'}. Once approved, every field on this PO is locked permanently.
          </p>
          {po.can.decide && (
            <div className="mt-3">
              <label htmlFor="reject-reason" className="ds-input-label">
                Reason (required to reject)
              </label>
              <input
                id="reject-reason"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Production date conflicts with Q4 schedule"
                className={fieldClass(error ?? undefined)}
              />
              {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
            </div>
          )}
        </div>
        {po.can.decide && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-48 lg:flex-col">
            <Button type="button" onClick={onApprove} isLoading={busy === 'approve'} disabled={busy !== null}>
              Approve &amp; lock
            </Button>
            <Button type="button" variant="outline" className="text-danger-600" onClick={reject} isLoading={busy === 'reject'} disabled={busy !== null}>
              Reject
            </Button>
            <p className="text-center text-xs text-text-muted">{po.approval ? 'It is your turn' : 'Admin only'}</p>
          </div>
        )}
      </div>
      {po.approval && po.approval.status !== 'CANCELLED' && <ApprovalSteps approval={po.approval} createdBy={po.createdBy.name ?? 'Someone'} createdAt={po.createdAt} />}
    </section>
  )
}
