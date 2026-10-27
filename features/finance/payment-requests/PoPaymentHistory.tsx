'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { useGetPurchaseOrderPaymentsQuery, type PoRef } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay, formatRequestNo, requestReference } from '../shared/format'
import { PAYMENT_STATE_META, paymentStateOf } from '../shared/paymentState'
import { REQUEST_STATUS_META } from '../shared/statusMeta'

interface PoPaymentHistoryProps {
  purchaseOrder: PoRef
  /** The request being edited, left out of its own history. */
  excludeId?: number | null
}

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 align-top'

/**
 * What has already been raised to pay a purchase order (its own requests and those paying its invoices), so a new
 * request against the PO or one of its invoices does not pay the same goods twice. Renders nothing when there is none.
 */
export const PoPaymentHistory: React.FC<PoPaymentHistoryProps> = ({ purchaseOrder, excludeId }) => {
  const { data: payments = [] } = useGetPurchaseOrderPaymentsQuery({ purchaseOrderId: purchaseOrder.id, excludeId: excludeId ?? undefined })
  if (payments.length === 0) return null

  // One PO is paid in one currency, so the totals add up as they are
  const currency = payments[0].currency
  const requested = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const paid = payments.reduce((sum, payment) => sum + payment.paidAmount, 0)

  return (
    <div className="mt-4 rounded-lg border border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-sm font-medium text-text-primary">Earlier payments on {purchaseOrder.poNo}</p>
        <p className="text-xs text-text-muted">
          {formatCurrencyAmount(currency, paid)} paid of {formatCurrencyAmount(currency, requested)} requested
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={HEAD}>Request</th>
              <th className={HEAD}>Against</th>
              <th className={HEAD}>Raised</th>
              <th className={`${HEAD} text-right`}>Amount</th>
              <th className={`${HEAD} text-right`}>Paid</th>
              <th className={HEAD}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const state = PAYMENT_STATE_META[paymentStateOf(payment.paidAmount, payment.amount, payment.paymentStatus)]
              const approval = REQUEST_STATUS_META[payment.status]
              return (
                <tr key={payment.id} className="border-t border-border">
                  <td className={`${CELL} font-medium`}>{formatRequestNo(payment.id)}</td>
                  <td className={CELL}>{requestReference({ ...payment, purchaseOrder })}</td>
                  <td className={CELL}>{formatDay(payment.createdAt)}</td>
                  <td className={`${CELL} text-right`}>{formatCurrencyAmount(payment.currency, payment.amount)}</td>
                  <td className={`${CELL} text-right`}>{formatCurrencyAmount(payment.currency, payment.paidAmount)}</td>
                  <td className={CELL}>
                    <StatusBadge {...(payment.status === 'APPROVED' ? state : approval)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
