'use client'

import React from 'react'
import Link from 'next/link'
import { FormSection as Section } from '@/features/finance/shared/FormSection'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { PoPayment } from '@/services/api/procurement.api'
import { PaymentBadge, poPaymentRequestsHref } from '../shared/poMeta'

interface PoPaymentsPanelProps {
  purchaseOrderId: number
  poNo: string
  currency: string
  payment: PoPayment
  /** This invoice's total (items + additional expenses). */
  invoiceTotal: number
}

const Figure: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className={strong ? 'text-base font-semibold text-text-primary tabular-nums' : 'text-sm font-medium text-text-primary tabular-nums'}>{value}</dd>
  </div>
)

/** What has already been paid against the purchase order, and what this invoice still leaves to pay. */
export const PoPaymentsPanel: React.FC<PoPaymentsPanelProps> = ({ purchaseOrderId, poNo, currency, payment, invoiceTotal }) => {
  const toPay = Math.max(0, Math.round((invoiceTotal - payment.paidAmount) * 100) / 100)

  return (
    <Section title="Payments" note={`processed against ${poNo}`}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Figure label="Requested" value={formatCurrencyAmount(currency, payment.requestedAmount)} />
        <Figure label="Processed (paid)" value={formatCurrencyAmount(currency, payment.paidAmount)} />
        <Figure label="Invoice total" value={formatCurrencyAmount(currency, invoiceTotal)} />
        <Figure label="Amount to be paid" value={formatCurrencyAmount(currency, toPay)} strong />
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <PaymentBadge payment={payment} withPercent />
        {payment.requestCount > 0 && (
          <Link href={poPaymentRequestsHref(purchaseOrderId)} className="font-medium text-primary-600 underline-offset-2 hover:underline">
            View payment requests ({payment.requestCount})
          </Link>
        )}
      </div>
    </Section>
  )
}
