'use client'

import React, { useState } from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import type { PurchaseOrderDetail } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'

interface ApprovalPanelProps {
  po: PurchaseOrderDetail
  busy: 'approve' | 'reject' | null
  onApprove: () => void
  onReject: (reason: string) => void
}

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
            <p className="text-center text-xs text-text-muted">Admin only</p>
          </div>
        )}
      </div>
    </section>
  )
}
