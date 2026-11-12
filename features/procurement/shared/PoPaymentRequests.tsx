'use client'

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { RequestDetailModal } from '@/features/finance/payment-requests/RequestDetailModal'
import { formatCurrencyAmount, formatDay, formatRequestNo, requestReference } from '@/features/finance/shared/format'
import { PAYMENT_STATE_META, paymentStateOf } from '@/features/finance/shared/paymentState'
import { REQUEST_STATUS_META } from '@/features/finance/shared/statusMeta'
import { useGetPaymentRequestsQuery } from '@/services/api/finance.api'

interface PoRef {
  id: number
  poNo: string
}

interface PurchaseInvoiceRef {
  id: number
  invoiceRef: string
}

/** What a list of payment requests is for: the target (null keeps the modal closed), its title and which requests to load. */
interface RequestsModalProps {
  title: string | undefined
  open: boolean
  filter: { purchaseOrderId?: number; purchaseInvoiceId?: number }
  emptyText: string
  onClose: () => void
}

/** Payment requests in a modal; picking one opens its details, and closing those comes back to the list. Nothing navigates away from the page. */
const PaymentRequestsModal: React.FC<RequestsModalProps> = ({ title, open, filter, emptyText, onClose }) => {
  const [openId, setOpenId] = useState<number | null>(null)
  const { data, isLoading, isError } = useGetPaymentRequestsQuery({ ...filter, page: 1, limit: 50 }, { skip: !open })
  const rows = data?.data ?? []

  return (
    <>
      <Modal isOpen={open && openId === null} onClose={onClose} title={title} size="lg">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-10 text-center font-medium text-danger-600">Could not load the payment requests.</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">{emptyText}</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
            {rows.map((row) => {
              const status = REQUEST_STATUS_META[row.status]
              const payment = PAYMENT_STATE_META[paymentStateOf(row.payment?.paidAmount, row.amount, row.payment?.status)]
              return (
                <li key={row.id}>
                  <button type="button" onClick={() => setOpenId(row.id)} className="flex w-full flex-col gap-1 px-1 py-2.5 text-left hover:bg-secondary-50">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-text-primary">{formatRequestNo(row.id)}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrencyAmount(row.currency, row.amount)}</span>
                    </span>
                    <span className="truncate text-xs text-text-muted">
                      {row.partner.name} · {requestReference(row)} · {formatDay(row.invoiceDate)}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge label={status.label} tone={status.tone} />
                      <StatusBadge label={payment.label} tone={payment.tone} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
      <RequestDetailModal requestId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

/** A purchase order's payment requests (raised on the PO or on its purchase invoices). */
export const PoPaymentRequestsModal: React.FC<{ purchaseOrder: PoRef | null; onClose: () => void }> = ({ purchaseOrder, onClose }) => (
  <PaymentRequestsModal
    open={purchaseOrder !== null}
    title={purchaseOrder ? `Payment requests · ${purchaseOrder.poNo}` : undefined}
    filter={{ purchaseOrderId: purchaseOrder?.id }}
    emptyText="No payment request for this purchase order yet."
    onClose={onClose}
  />
)

/** The payment requests raised against one purchase invoice. */
export const PiPaymentRequestsModal: React.FC<{ purchaseInvoice: PurchaseInvoiceRef | null; onClose: () => void }> = ({ purchaseInvoice, onClose }) => (
  <PaymentRequestsModal
    open={purchaseInvoice !== null}
    title={purchaseInvoice ? `Payment requests · ${purchaseInvoice.invoiceRef}` : undefined}
    filter={{ purchaseInvoiceId: purchaseInvoice?.id }}
    emptyText="No payment request for this purchase invoice yet."
    onClose={onClose}
  />
)

/** "View payment requests (n)": opens {@link PoPaymentRequestsModal} for the PO, used wherever a PO lists them. */
export const ViewPoPaymentRequests: React.FC<{ purchaseOrder: PoRef; count?: number; label?: string; className?: string }> = ({
  purchaseOrder,
  count,
  label = 'View payment requests',
  className = 'text-sm font-medium text-primary-600 underline-offset-2 hover:underline',
}) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {count === undefined ? label : `${label} (${count})`}
      </button>
      <PoPaymentRequestsModal purchaseOrder={open ? purchaseOrder : null} onClose={() => setOpen(false)} />
    </>
  )
}
