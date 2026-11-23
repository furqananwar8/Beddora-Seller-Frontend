'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useGetEmailHistoryQuery, type EmailAttempt, type EmailStatus } from '@/services/api/systemEmail.api'
import { cn } from '@/utils/cn'
import { stamp, STATUS_META } from './emailMeta'

interface EmailHistoryDialogProps {
  /** The email to show; null keeps the dialog closed. */
  emailId: number | null
  busy: boolean
  /** Its status tells whether the resend needs a confirmation (it was already delivered). */
  onResend: (emailId: number, status: EmailStatus) => void
  onClose: () => void
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="text-text-primary">{children}</dd>
  </>
)

/** One try: when, whether it went through, why not, and whether the queue or a person started it. */
const Attempt: React.FC<{ attempt: EmailAttempt }> = ({ attempt }) => {
  const sent = attempt.outcome === 'SENT'
  return (
    <li className="relative pb-4 last:pb-0">
      <span className={cn('absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full', sent ? 'bg-success-500' : 'bg-danger-500')} aria-hidden />
      <div className="text-sm">
        <span className="font-semibold text-text-primary">{sent ? 'Sent' : 'Failed'}</span> · {stamp(attempt.at)}
      </div>
      <div className="text-xs text-text-muted">{attempt.trigger === 'MANUAL' ? `Resent by ${attempt.by?.name ?? 'someone'}` : 'Automatic'}</div>
      {attempt.error && <div className="mt-0.5 break-words text-xs text-danger-600">{attempt.error}</div>}
    </li>
  )
}

/** Delivery history of one email: every try with its time and result. It stays current while open (the live updates refetch it). */
export const EmailHistoryDialog: React.FC<EmailHistoryDialogProps> = ({ emailId, busy, onResend, onClose }) => {
  const { data, isLoading, isError } = useGetEmailHistoryQuery(emailId ?? 0, { skip: emailId === null })

  return (
    <Modal isOpen={emailId !== null} onClose={onClose} title={data ? `Delivery history · ${data.event}` : 'Delivery history'} size="lg" closeOnEscape>
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : isError || !data ? (
        <p className="text-sm text-danger-600">Could not load the delivery history.</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
            <Fact label="To">{data.toAddress}</Fact>
            <Fact label="Subject">{data.subject}</Fact>
            <Fact label="Status">
              <span className="inline-flex items-center gap-2">
                <StatusBadge label={STATUS_META[data.status].label} tone={STATUS_META[data.status].tone} />
                {data.sendCount > 0 && <span className="text-text-muted">sent {data.sendCount} time{data.sendCount === 1 ? '' : 's'}</span>}
              </span>
            </Fact>
            <Fact label="First sent">{data.firstSentAt ? stamp(data.firstSentAt) : '—'}</Fact>
            <Fact label="Last sent">{data.lastSentAt ? stamp(data.lastSentAt) : '—'}</Fact>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Every try</h3>
            {data.attempts.length === 0 ? (
              <p className="text-sm text-text-muted">No try is recorded for this email.</p>
            ) : (
              <ol className="ml-2 border-l-2 border-border pl-5">
                {data.attempts.map((attempt) => (
                  <Attempt key={attempt.id} attempt={attempt} />
                ))}
              </ol>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => onResend(data.id, data.status)} isLoading={busy}>
              Resend email
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
