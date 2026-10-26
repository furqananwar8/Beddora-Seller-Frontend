'use client'

import React from 'react'
import type { PartnerOption } from '@/services/api/finance.api'
import { paymentTermLabel } from '../shared/paymentTerm'

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="truncate text-sm text-text-primary">{value}</dd>
  </div>
)

/** The picked partner's payment term and the account (or card link) the request will be paid to. */
export const PartnerPaymentInfo: React.FC<{ partner: PartnerOption }> = ({ partner }) => {
  const method = partner.paymentDetails
  return (
    <dl className="mt-3 grid gap-3 rounded-lg border border-border bg-secondary-50 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
      <Detail label="Payment term" value={paymentTermLabel(partner.paymentTermDays)} />
      {!method && <Detail label="Bank details" value="No payment method on file" />}
      {method?.type === 'BANK' && (
        <>
          <Detail label="Bank account" value={method.label} />
          {method.accountHolder && <Detail label="Account holder" value={method.accountHolder} />}
          {(method.swiftCode || method.routingNo) && <Detail label="SWIFT / Routing" value={[method.swiftCode, method.routingNo].filter(Boolean).join(' · ')} />}
        </>
      )}
      {method?.type === 'CARD_LINK' && method.paymentLink && (
        <Detail
          label="Payment link"
          value={
            <a href={method.paymentLink} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
              {method.paymentLink}
            </a>
          }
        />
      )}
    </dl>
  )
}
