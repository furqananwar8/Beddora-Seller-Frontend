'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Textarea } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { PaymentRequestDetail, useGetPaymentRequestQuery } from '@/services/api/finance.api'
import { financeErrorMessage } from '../shared/useFinanceFeedback'
import { formatCurrencyAmount, formatDay, formatRequestNo } from '../shared/format'
import { REQUEST_STATUS_META } from '../shared/statusMeta'
import { ApprovalTimeline } from './ApprovalTimeline'
import { DocumentChips } from '../shared/DocumentChips'
import { RejectDialog } from './RejectDialog'
import { useRequestActions } from './useRequestActions'

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 py-1.5 text-sm sm:grid-cols-[130px_1fr]">
    <dt className="text-text-muted">{label}</dt>
    <dd className="min-w-0 break-words font-medium text-text-primary">{children}</dd>
  </div>
)

const Summary: React.FC<{ detail: PaymentRequestDetail }> = ({ detail }) => (
  <dl className="divide-y divide-border/50">
    <Row label="Partner">
      {detail.partner.name} <span className="font-normal text-text-muted">({detail.partner.type === 'VENDOR' ? 'Vendor' : 'Supplier'})</span>
    </Row>
    <Row label="Invoice">
      {detail.invoiceNo} · {formatDay(detail.invoiceDate)}
    </Row>
    <Row label="Container #">{detail.containerNo || '-'}</Row>
    <Row label="Destination">{detail.marketplace?.name ?? '-'}</Row>
    <Row label="Expense type">{detail.expenseType.name}</Row>
    <Row label="Amount">
      <span className="text-base">{formatCurrencyAmount(detail.currency, detail.amount)}</span>
    </Row>
    <Row label="Remarks">{detail.remarks || '-'}</Row>
    <Row label="Documents">
      <DocumentChips documents={detail.documents} />
    </Row>
  </dl>
)

interface DetailBodyProps {
  detail: PaymentRequestDetail
  onClose: () => void
}

const DetailBody: React.FC<DetailBodyProps> = ({ detail, onClose }) => {
  const actions = useRequestActions()
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const meta = REQUEST_STATUS_META[detail.status]
  const { can } = detail
  const rejectedReason = detail.status === 'REJECTED' ? detail.decisionNote : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 pr-8">
        <h2 className="text-xl font-bold text-text-primary">{formatRequestNo(detail.id)}</h2>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      {detail.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          <p className="font-semibold">Rejected{detail.decidedBy?.name ? ` by ${detail.decidedBy.name}` : ''}</p>
          {rejectedReason && <p className="mt-1 break-words">{rejectedReason}</p>}
          <p className="mt-1 text-xs">Update your request and resubmit.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Request summary</h3>
          <Summary detail={detail} />
          <div className="mt-4 flex flex-wrap gap-2">
            {can.edit && (
              <Link href={`/dashboard/finance/payment-request/new?edit=${detail.id}`} className="ds-button ds-button-outline ds-button-sm">
                Edit
              </Link>
            )}
            {can.submit && detail.status === 'REJECTED' && (
              <Button size="sm" isLoading={actions.busy} onClick={() => actions.resubmit(detail.id)}>
                Resubmit
              </Button>
            )}
            {can.withdraw && (
              <Button size="sm" variant="outline" className="text-danger-600" isLoading={actions.busy} onClick={() => actions.withdraw(detail.id)}>
                Withdraw request
              </Button>
            )}
          </div>
          {detail.status === 'PENDING_APPROVAL' && !can.decide && (
            <p className="mt-3 text-xs text-text-muted">Once submitted the request is locked. Withdraw returns it to Draft.</p>
          )}
        </section>

        <section className="flex max-h-[360px] min-w-0 flex-col rounded-xl border border-border lg:max-h-[480px]">
          <h3 className="sticky top-0 z-10 rounded-t-xl border-b border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary">
            Approval progress
          </h3>
          <ApprovalTimeline events={detail.events} status={detail.status} />
        </section>
      </div>

      {can.decide && (
        <section className="mt-4 rounded-xl border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Your decision</h3>
          <Textarea rows={2} className="rounded-lg" placeholder="Optional note for the requester" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="danger" disabled={actions.busy} onClick={() => setRejecting(true)}>
              Reject
            </Button>
            <Button
              size="sm"
              isLoading={actions.busy}
              onClick={async () => {
                if (await actions.approve(detail.id, note)) onClose()
              }}
            >
              Approve
            </Button>
          </div>
        </section>
      )}

      <RejectDialog
        requestId={rejecting ? detail.id : null}
        submitting={actions.rejecting}
        onConfirm={actions.reject}
        onClose={() => setRejecting(false)}
      />
    </div>
  )
}

interface RequestDetailModalProps {
  /** Request id from `?open=`; null keeps the modal closed. */
  requestId: number | null
  onClose: () => void
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ requestId, onClose }) => {
  const { data, isLoading, isError, error } = useGetPaymentRequestQuery(requestId ?? 0, { skip: requestId === null })

  return (
    <Modal isOpen={requestId !== null} onClose={onClose} size="xl">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <div className="py-12 text-center font-medium text-danger-600">{financeErrorMessage(error, 'Could not load this payment request.')}</div>
      ) : (
        <DetailBody detail={data} onClose={onClose} />
      )}
    </Modal>
  )
}
