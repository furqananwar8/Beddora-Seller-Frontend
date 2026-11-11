'use client'

import React from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { formatCurrencyAmount, formatDay } from '@/features/finance/shared/format'
import { DOC_STATUS_META, REQUEST_STATUS_META } from '@/features/finance/shared/statusMeta'
import type { ContainerDetail } from '@/services/api/procurement.api'
import { ExpandablePanel, PanelEmpty } from './Panel'

const REQUESTS = '/dashboard/finance/payment-request'
/** How many requests the summary lists before the rest go behind "More". */
const SUMMARY_ROWS = 3

type ContainerPayment = ContainerDetail['payments'][number]

/** Paid / requested per currency over the requests that count (not drafts or rejected). */
function totalsOf(payments: ContainerPayment[]) {
  const totals = new Map<string, { requested: number; paid: number }>()
  for (const payment of payments.filter((item) => item.status !== 'REJECTED' && item.status !== 'DRAFT')) {
    const total = totals.get(payment.currency) ?? { requested: 0, paid: 0 }
    totals.set(payment.currency, { requested: total.requested + payment.amount, paid: total.paid + payment.paidAmount })
  }
  return [...totals]
}

const Totals: React.FC<{ payments: ContainerPayment[] }> = ({ payments }) => (
  <>
    {totalsOf(payments).map(([currency, total]) => (
      <div key={currency} className="flex justify-between rounded-lg bg-secondary-50 px-3 py-2 text-sm">
        <span className="text-text-muted">Paid / requested</span>
        <span className="font-semibold tabular-nums text-text-primary">
          {formatCurrencyAmount(currency, total.paid)} / {formatCurrencyAmount(currency, total.requested)}
        </span>
      </div>
    ))}
  </>
)

const RequestRow: React.FC<{ payment: ContainerPayment; compact?: boolean }> = ({ payment, compact }) => (
  <li className="flex flex-col gap-1 py-2.5">
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-sm font-semibold text-text-primary">{payment.requestNo}</span>
      <span className="text-sm font-semibold tabular-nums">{formatCurrencyAmount(payment.currency, payment.amount)}</span>
    </div>
    <p className="truncate text-xs text-text-muted">
      {payment.partner.name}
      {payment.invoiceNo ? ` · ${payment.invoiceNo}` : ''} · {formatDay(payment.invoiceDate)}
    </p>
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge label={REQUEST_STATUS_META[payment.status].label} tone={REQUEST_STATUS_META[payment.status].tone} />
      {payment.paymentStatus && <StatusBadge label={DOC_STATUS_META[payment.paymentStatus].label} tone={DOC_STATUS_META[payment.paymentStatus].tone} />}
      {!compact && payment.paidAmount > 0 && <span className="text-xs text-text-muted">paid {formatCurrencyAmount(payment.currency, payment.paidAmount)}</span>}
    </div>
  </li>
)

/** Payment requests raised against this container (their "Container No" is its number): totals and the latest few by default, all of them behind "More". */
export const PaymentRequestsPanel: React.FC<{ container: ContainerDetail }> = ({ container }) => {
  const { payments, containerNumber } = container
  const empty = !containerNumber ? (
    <PanelEmpty>Add the container number (Edit container) to link payment requests to it.</PanelEmpty>
  ) : payments.length === 0 ? (
    <PanelEmpty>
      No payment request has container number <span className="font-mono font-semibold">{containerNumber}</span> yet.
    </PanelEmpty>
  ) : null
  const shown = payments.slice(0, SUMMARY_ROWS)

  return (
    <ExpandablePanel
      title="Payment requests"
      count={payments.length}
      modalTitle="Payment requests"
      hasMore={!empty}
      action={
        <Link href={`${REQUESTS}?search=${encodeURIComponent(containerNumber ?? '')}`} className="text-xs font-medium text-primary-600 underline-offset-2 hover:underline">
          Open in Finance
        </Link>
      }
      summary={
        empty ?? (
          <>
            <Totals payments={payments} />
            <ul className="flex flex-col divide-y divide-border">
              {shown.map((payment) => (
                <RequestRow key={payment.id} payment={payment} compact />
              ))}
            </ul>
            {payments.length > shown.length && <p className="text-xs text-text-muted">+ {payments.length - shown.length} more</p>}
          </>
        )
      }
    >
      <Totals payments={payments} />
      <ul className="flex flex-col divide-y divide-border">
        {payments.map((payment) => (
          <RequestRow key={payment.id} payment={payment} />
        ))}
      </ul>
    </ExpandablePanel>
  )
}
