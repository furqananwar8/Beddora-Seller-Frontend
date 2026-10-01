'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import type { DocStatus, PaymentDocumentSummary } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

interface PaymentKpiRowProps {
  summary: PaymentDocumentSummary | undefined
  active: DocStatus | null
  onToggle: (status: DocStatus) => void
}

const joinAmounts = (parts: string[], fallback: string) => (parts.length ? parts.join(' · ') : fallback)

export const PaymentKpiRow: React.FC<PaymentKpiRowProps> = ({ summary, active, onToggle }) => {
  const due = summary?.dueByCurrency ?? []
  const paidMonth = summary?.paidThisMonth ?? []

  const tiles: Array<{ status: DocStatus; title: string; value: number; subtitle: string }> = [
    {
      status: 'PAYMENT_PENDING',
      title: 'Payment Pending',
      value: summary?.byStatus.PAYMENT_PENDING ?? 0,
      subtitle: joinAmounts(
        due.filter((d) => d.due > 0).map((d) => `${formatCurrencyAmount(d.currency, d.due)} due`),
        'Nothing due'
      ),
    },
    {
      status: 'PARTIALLY_PAID',
      title: 'Partially Paid',
      value: summary?.byStatus.PARTIALLY_PAID ?? 0,
      subtitle: joinAmounts(
        due.filter((d) => d.paid > 0).map((d) => `${d.currency} ${formatMoney(d.paid)} of ${formatMoney(d.total)}`),
        'No partial payments'
      ),
    },
    {
      status: 'POP_UPLOADED',
      title: 'Payment recorded',
      value: summary?.byStatus.POP_UPLOADED ?? 0,
      subtitle: 'Ready to mark paid',
    },
    {
      status: 'PAID',
      title: 'Paid this month',
      value: paidMonth.reduce((sum, p) => sum + p.count, 0),
      subtitle: joinAmounts(
        paidMonth.map((p) => formatCurrencyAmount(p.currency, p.amount)),
        'No payments yet'
      ),
    },
  ]

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <button
          key={tile.status}
          type="button"
          aria-pressed={active === tile.status}
          onClick={() => onToggle(tile.status)}
          className={cn(
            'rounded-xl text-left transition focus:outline-none focus:ring-2 focus:ring-secondary-300',
            active === tile.status && 'ring-2 ring-primary-600'
          )}
        >
          <KpiCard title={tile.title} value={tile.value} subtitle={tile.subtitle} />
        </button>
      ))}
    </div>
  )
}
