'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Textarea } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { ApprovalTimeline } from '@/features/finance/payment-requests/ApprovalTimeline'
import { DocumentChips } from '@/features/finance/shared/DocumentChips'
import { formatCurrencyAmount, formatDay, formatMoney } from '@/features/finance/shared/format'
import { REQUEST_STATUS_META } from '@/features/finance/shared/statusMeta'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { PurchaseInvoiceDetail, purchaseInvoiceDocumentPath, useGetPurchaseInvoiceDestinationsQuery, useGetPurchaseInvoiceQuery } from '@/services/api/procurement.api'
import { PDF_STATUS_META, PURCHASE_INVOICES_URL, PURCHASE_INVOICE_STATUS_META } from '../shared/poMeta'
import { usePurchaseInvoiceActions } from './usePurchaseInvoiceActions'

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 py-1.5 text-sm sm:grid-cols-[130px_1fr]">
    <dt className="text-text-muted">{label}</dt>
    <dd className="min-w-0 break-words font-medium text-text-primary">{children}</dd>
  </div>
)

const qty = (value: number) => value.toLocaleString('en-CA')

const Summary: React.FC<{ detail: PurchaseInvoiceDetail }> = ({ detail }) => {
  // Destinations are named as on the form (USA, Canada), not by their marketplace domain
  const { data: destinations } = useGetPurchaseInvoiceDestinationsQuery()
  const destination = destinations?.find((option) => option.id === detail.marketplaceId)?.name ?? detail.marketplace?.name ?? '-'
  return (
  <dl className="divide-y divide-border/50">
    <Row label="Partner">{detail.partner.name}</Row>
    <Row label="Invoice">
      {detail.invoiceNo} · {formatDay(detail.invoiceDate)}
    </Row>
    <Row label="Purchase order">
      <Link href={`/dashboard/procurement/purchase-orders/${detail.purchaseOrder.id}`} className="text-primary-600 hover:underline">
        {detail.purchaseOrder.poNo}
      </Link>{' '}
      <span className="font-normal text-text-muted">· ordered {formatCurrencyAmount(detail.currency, detail.totals.po)}</span>
    </Row>
    <Row label="Destination">{destination}</Row>
    <Row label="Expense type">{detail.expenseType.name}</Row>
    <Row label="Amount">
      <span className="text-base">{formatCurrencyAmount(detail.currency, detail.amount)}</span>
      <span className="block text-xs font-normal text-text-muted">
        Items {formatMoney(detail.totals.invoice)} + expenses {formatMoney(detail.totals.expenses)}
      </span>
    </Row>
    {['PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID'].includes(detail.status) && (
      <>
        <Row label="Paid">
          <span className="text-success-700">{formatCurrencyAmount(detail.currency, detail.payment.paid)}</span>
        </Row>
        <Row label="Remaining">
          <span className={detail.payment.remaining > 0 ? 'text-danger-600' : 'text-text-primary'}>{formatCurrencyAmount(detail.currency, detail.payment.remaining)}</span>
        </Row>
      </>
    )}
    <Row label="Payment requests">
      {detail.payment.requests.length === 0 ? (
        <span className="font-normal text-text-muted">{detail.status === 'PAYMENT_PENDING' || detail.status === 'PARTIALLY_PAID' ? 'None yet. Raise one with this invoice number.' : '-'}</span>
      ) : (
        <ul className="space-y-1">
          {detail.payment.requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center gap-2">
              <Link href={`/dashboard/finance/payment-request?open=${request.id}`} className="font-mono text-primary-600 hover:underline">
                {request.requestNo}
              </Link>
              <StatusBadge label={REQUEST_STATUS_META[request.status].label} tone={REQUEST_STATUS_META[request.status].tone} />
              <span className="text-xs font-normal text-text-muted">
                {formatMoney(request.paidAmount)} of {formatMoney(request.amount)} paid
              </span>
            </li>
          ))}
        </ul>
      )}
    </Row>
    <Row label="Remarks">{detail.remarks || '-'}</Row>
    <Row label="Documents">
      <DocumentChips documents={detail.documents} documentPath={(doc) => purchaseInvoiceDocumentPath(detail.id, doc.id)} />
    </Row>
  </dl>
  )
}

/** The invoiced items next to the PO, and the additional expenses: what the approver is approving. */
const Contents: React.FC<{ detail: PurchaseInvoiceDetail }> = ({ detail }) => (
  <div className="overflow-x-auto">
    <table className="min-w-[520px] w-full text-sm">
      <thead className="text-xs uppercase tracking-wide text-text-muted">
        <tr className="border-b border-border">
          <th className="py-1.5 text-left font-semibold">Item</th>
          <th className="py-1.5 text-right font-semibold">PO qty × rate</th>
          <th className="py-1.5 text-right font-semibold">Invoiced qty × rate</th>
          <th className="py-1.5 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {detail.lines.map((line) => (
          <tr key={line.id} className="border-b border-border/50">
            <td className="py-1.5">
              <span className="block font-mono text-xs text-text-muted">{line.product.pid}</span>
              {line.product.label}
            </td>
            <td className="py-1.5 text-right tabular-nums text-text-secondary">
              {qty(line.po.units)} × {formatMoney(line.po.unitPrice)}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {qty(line.units)} × {formatMoney(line.unitPrice)}
            </td>
            <td className="py-1.5 text-right tabular-nums font-medium">{formatMoney(line.amount)}</td>
          </tr>
        ))}
        {detail.expenses.map((expense) => (
          <tr key={`expense-${expense.id}`} className="border-b border-border/50">
            <td className="py-1.5" colSpan={3}>
              {expense.name}
              {expense.remarks && <span className="text-text-muted"> · {expense.remarks}</span>}
            </td>
            <td className="py-1.5 text-right tabular-nums font-medium">{formatMoney(expense.amount)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="py-2" colSpan={3}>
            Total
          </td>
          <td className="py-2 text-right tabular-nums">{formatCurrencyAmount(detail.currency, detail.amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>
)

const DetailBody: React.FC<{ detail: PurchaseInvoiceDetail; onClose: () => void }> = ({ detail, onClose }) => {
  const actions = usePurchaseInvoiceActions()
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const meta = PURCHASE_INVOICE_STATUS_META[detail.status]
  const pdf = PDF_STATUS_META[detail.pdfStatus]
  const { can } = detail
  const busy = actions.busy !== null
  const decide = async (run: () => Promise<boolean>) => {
    if (await run()) onClose()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 pr-8">
        <h2 className="text-xl font-bold text-text-primary">{detail.invoiceRef}</h2>
        <StatusBadge label={meta.label} tone={meta.tone} />
        <button type="button" onClick={() => void actions.downloadPdf(detail)} className="ml-auto text-sm font-medium text-primary-600 hover:underline">
          Download PDF <span className="text-xs font-normal text-text-muted">({pdf.label.toLowerCase()})</span>
        </button>
      </div>

      {detail.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          <p className="font-semibold">Rejected{detail.decidedBy?.name ? ` by ${detail.decidedBy.name}` : ''}</p>
          {detail.decisionNote && <p className="mt-1 break-words">{detail.decisionNote}</p>}
          <p className="mt-1 text-xs">Update the invoice and resubmit.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Invoice summary</h3>
          <Summary detail={detail} />
          <div className="mt-4 flex flex-wrap gap-2">
            {can.edit && (
              <Link href={`${PURCHASE_INVOICES_URL}/new?edit=${detail.id}`} className="ds-button ds-button-outline ds-button-sm">
                Edit
              </Link>
            )}
            {can.submit && (
              <Button size="sm" isLoading={actions.busy?.action === 'submit'} disabled={busy} onClick={() => void decide(() => actions.submit(detail))}>
                {detail.status === 'REJECTED' ? 'Resubmit' : 'Submit for approval'}
              </Button>
            )}
            {can.withdraw && (
              <Button size="sm" variant="outline" isLoading={actions.busy?.action === 'withdraw'} disabled={busy} onClick={() => void decide(() => actions.withdraw(detail))}>
                Withdraw to draft
              </Button>
            )}
          </div>
          {detail.status === 'PENDING_APPROVAL' && !can.decide && (
            <p className="mt-3 text-xs text-text-muted">Once submitted the invoice is locked. Withdraw returns it to Draft so you can edit it and send it again.</p>
          )}
        </section>

        <section className="flex max-h-[360px] min-w-0 flex-col rounded-xl border border-border lg:max-h-[480px]">
          <h3 className="sticky top-0 z-10 rounded-t-xl border-b border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary">Approval progress</h3>
          <ApprovalTimeline events={detail.events} status={detail.status} />
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Items and expenses</h3>
        <Contents detail={detail} />
      </section>

      {can.decide && (
        <section className="mt-4 rounded-xl border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Your decision</h3>
          <Textarea rows={2} className="rounded-lg" placeholder="Optional note for the requester" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
              Reject
            </Button>
            <Button size="sm" variant="outline" isLoading={actions.busy?.action === 'hold'} disabled={busy} onClick={() => void decide(() => actions.hold(detail))}>
              On hold
            </Button>
            <Button size="sm" isLoading={actions.busy?.action === 'approve'} disabled={busy} onClick={() => void decide(() => actions.approve(detail, note))}>
              Approve
            </Button>
          </div>
          <p className="mt-2 text-xs text-text-muted">On hold sends it back to the creator&apos;s drafts unchanged. Once approved, payment requests can be raised against it.</p>
        </section>
      )}

      <ReasonDialog
        isOpen={rejecting}
        title={`Reject ${detail.invoiceRef}?`}
        description="Whoever raised it is notified with your reason; they can update it and send it for approval again."
        confirmLabel="Reject invoice"
        placeholder="e.g. Amount does not match the supplier's invoice"
        minLength={3}
        submitting={actions.busy?.action === 'reject'}
        onConfirm={async (reason) => {
          const done = await actions.reject(detail, reason)
          if (done) onClose()
          return done
        }}
        onClose={() => setRejecting(false)}
      />
    </div>
  )
}

/** A purchase invoice's details, approval timeline and the actions the viewer may take (opened by `?open=`). */
export const PurchaseInvoiceDetailModal: React.FC<{ invoiceId: number | null; onClose: () => void }> = ({ invoiceId, onClose }) => {
  const { data, isLoading, isError, error } = useGetPurchaseInvoiceQuery(invoiceId ?? 0, { skip: invoiceId === null })

  return (
    <Modal isOpen={invoiceId !== null} onClose={onClose} size="xl">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <div className="py-12 text-center font-medium text-danger-600">{apiErrorMessage(error, 'Could not load this purchase invoice.')}</div>
      ) : (
        <DetailBody detail={data} onClose={onClose} />
      )}
    </Modal>
  )
}
