import React from 'react'
import type { PoApproval, PoApprovalStep } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'

type StepState = PoApprovalStep['state'] | 'SUBMITTED' | 'FINAL' | 'FINAL_DONE'

const DOT: Record<StepState, string> = {
  SUBMITTED: 'bg-success-500 text-white',
  DONE: 'bg-success-500 text-white',
  CURRENT: 'bg-warning-500 text-white',
  WAITING: 'bg-secondary-200 text-text-muted',
  REJECTED: 'bg-danger-500 text-white',
  FINAL: 'bg-secondary-200 text-text-muted',
  FINAL_DONE: 'bg-success-500 text-white',
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

interface ApprovalStepperProps {
  approval: PoApproval
  /** Who started the chain and when (the first stop). */
  startedBy: string
  startedAt: string
  /** "Submitted" by default; a price analysis starts when its quotes are saved. */
  startLabel?: string
}

/**
 * The approval chain of any record (PO, purchase invoice, payment request, price analysis) as a line:
 * who started it, each step with who is asked and where it stands, then the approval.
 */
export const ApprovalStepper: React.FC<ApprovalStepperProps> = ({ approval, startedBy, startedAt, startLabel = 'Submitted' }) => {
  const allDone = approval.steps.every((step) => step.state === 'DONE')
  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start">
        <Stop state="SUBMITTED" title={startLabel} lines={[startedBy, formatCalendarDay(startedAt)]} />
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
        <Link passed={allDone} />
        <Stop state={allDone ? 'FINAL_DONE' : 'FINAL'} mark={allDone ? undefined : ''} title="Approved" lines={[]} />
      </ol>
    </div>
  )
}
