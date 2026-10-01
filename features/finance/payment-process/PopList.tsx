'use client'

import React from 'react'
import type { Pop } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay, formatMoney } from '../shared/format'
import { DocumentChips } from '../shared/DocumentChips'

const Item: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="truncate text-sm text-text-primary">{children}</dd>
  </div>
)

export const PopList: React.FC<{ pops: Pop[] }> = ({ pops }) => {
  if (pops.length === 0) return <p className="text-sm text-text-muted">No payment recorded yet.</p>

  return (
    <ul className="space-y-3">
      {pops.map((pop) => {
        const rateDiffers = pop.fxRateSuggested !== null && pop.fxRateSuggested !== pop.fxRateApplied
        return (
          <li key={pop.id} className="rounded-lg border border-border p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Item label="Date">{formatDay(pop.paymentDate)}</Item>
              <Item label="Type">{pop.type === 'FULL' ? 'Full' : 'Split'}</Item>
              <Item label="Amount">{formatCurrencyAmount(pop.currency, pop.amount)}</Item>
              <Item label="FX rate applied">
                {pop.fxRateApplied}
                {rateDiffers && <span className="text-text-muted"> (suggested {pop.fxRateSuggested})</span>}
              </Item>
              <Item label={`Base amount (${pop.baseCurrency})`}>{formatMoney(pop.baseAmount)}</Item>
              <Item label="Reference">{pop.reference || '-'}</Item>
              <Item label="Processed by">{pop.processedBy.name ?? `User ${pop.processedBy.id}`}</Item>
            </dl>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {pop.documents.length > 0 ? (
                <DocumentChips documents={pop.documents} />
              ) : (
                <span className="text-xs text-text-muted">No proof file attached to this payment.</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
