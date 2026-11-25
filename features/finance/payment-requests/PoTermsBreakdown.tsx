'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import type { PayablePurchaseOrder } from '@/services/api/finance.api'
import { formatCurrencyAmount } from '../shared/format'

const HEAD = 'px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-right tabular-nums'

interface PoTermsBreakdownProps {
  /** The PO being paid; null until one is picked. */
  purchaseOrder: PayablePurchaseOrder | null
}

/**
 * The PO's payment terms, split into the advance and the balance with what each comes to, what is already requested and
 * paid against it, and what is left to request. Replaces the single read-only "payment terms" box: whoever raises a payment
 * sees how much advance is still due, even when an earlier request paid only part of it.
 */
export const PoTermsBreakdown: React.FC<PoTermsBreakdownProps> = ({ purchaseOrder }) => {
  if (!purchaseOrder) return <p className="rounded-lg border border-border bg-secondary-50 px-3 py-2 text-sm text-text-muted">Pick the purchase order to see its payment terms.</p>
  const { terms, currency } = purchaseOrder
  const money = (value: number) => formatCurrencyAmount(currency, value)
  const rows = [
    { key: 'advance', title: 'Advance', percent: terms.advancePercent, amount: terms.advanceAmount, requested: terms.advanceRequested, paid: terms.advancePaid, remaining: terms.advanceRemaining },
    { key: 'balance', title: terms.balanceTerm, percent: terms.balancePercent, amount: terms.balanceAmount, requested: terms.balanceRequested, paid: terms.balancePaid, remaining: terms.balanceRemaining },
  ].filter((row) => row.percent > 0)

  return (
    <div className="overflow-hidden rounded-lg border border-border" data-testid="po-terms-breakdown">
      {purchaseOrder.paymentTerms && <p className="border-b border-border bg-secondary-50 px-3 py-2 text-sm text-text-secondary">Terms typed on the PO: {purchaseOrder.paymentTerms}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50">
            <tr>
              <th className={`${HEAD} text-left`}>Term</th>
              <th className={HEAD}>%</th>
              <th className={HEAD}>Amount</th>
              <th className={HEAD}>Requested</th>
              <th className={HEAD}>Paid</th>
              <th className={HEAD}>Left to request</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border" data-testid={`terms-row-${row.key}`}>
                <td className="px-3 py-2 text-left font-medium text-text-primary">
                  {row.title}
                  {row.remaining <= 0 ? <StatusBadge label="Requested in full" tone="success" className="ml-2" /> : row.requested > 0 ? <StatusBadge label="Part requested" tone="warning" className="ml-2" /> : null}
                </td>
                <td className={CELL}>{row.percent}%</td>
                <td className={CELL}>{money(row.amount)}</td>
                <td className={CELL}>{money(row.requested)}</td>
                <td className={CELL}>{money(row.paid)}</td>
                <td className={`${CELL} font-semibold text-text-primary`}>{money(row.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
