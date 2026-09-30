'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import type { FinanceDocument } from '@/services/api/finance.api'
import { DocumentChips } from '../shared/DocumentChips'

export interface PaymentMethodCardData {
  label: string
  type: 'BANK' | 'CARD_LINK'
  swiftCode?: string | null
  routingNo?: string | null
  accountHolder?: string | null
  paymentLink?: string | null
  documents?: FinanceDocument[]
  /** Names of files that are staged but not uploaded yet. */
  pendingFiles?: string[]
}

interface PaymentMethodCardProps {
  method: PaymentMethodCardData
  staged?: boolean
  removing?: boolean
  onRemove: () => void
}

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="truncate text-sm text-text-primary">{value}</dd>
  </div>
)

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ method, staged, removing, onRemove }) => (
  <div className="rounded-lg border border-border bg-surface p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-text-primary">{method.label}</div>
        {staged && <div className="text-xs text-text-muted">Will be saved on submit</div>}
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onRemove} disabled={removing} aria-label={`Remove ${method.label}`}>
        Remove
      </Button>
    </div>

    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
      {method.type === 'BANK' ? (
        <>
          {method.swiftCode && <Detail label="SWIFT" value={method.swiftCode} />}
          {method.routingNo && <Detail label="Routing no" value={method.routingNo} />}
          {method.accountHolder && <Detail label="Account holder" value={method.accountHolder} />}
        </>
      ) : (
        method.paymentLink && <Detail label="Payment link" value={method.paymentLink} />
      )}
    </dl>

    <DocumentChips documents={method.documents ?? []} pendingNames={method.pendingFiles} emptyText={null} className="mt-3" />
  </div>
)
