'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { BankDetails, PaymentDocumentDetail, useRevealBankDetailsMutation } from '@/services/api/finance.api'
import { financeErrorMessage } from '../shared/useFinanceFeedback'

const Row: React.FC<{ label: string; value: string | null }> = ({ label, value }) =>
  value ? (
    <div className="min-w-0">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="break-all font-mono text-sm text-text-primary">{value}</dd>
    </div>
  ) : null

interface BankDetailsPanelProps {
  docId: number
  method: PaymentDocumentDetail['paymentMethod']
}

export const BankDetailsPanel: React.FC<BankDetailsPanelProps> = ({ docId, method }) => {
  const [reveal, { isLoading }] = useRevealBankDetailsMutation()
  const [details, setDetails] = useState<BankDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!method) return <p className="text-sm text-text-muted">No payment method on file.</p>

  const label = method.type === 'BANK' ? `Bank transfer${method.ibanLast4 ?? method.accountNumberLast4 ? ` ····${method.ibanLast4 ?? method.accountNumberLast4}` : ''}` : 'Payment link'

  const show = async () => {
    setError(null)
    try {
      setDetails(await reveal(docId).unwrap())
    } catch (err) {
      setError(financeErrorMessage(err, 'Could not load the payment details'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-text-primary">{label}</span>
        {details ? (
          <Button size="sm" variant="outline" onClick={() => setDetails(null)}>
            Hide
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={show} isLoading={isLoading}>
            Show bank details
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
      {details && (
        <>
          <dl className="grid grid-cols-1 gap-2 rounded-lg bg-secondary-50 p-3 sm:grid-cols-2">
            <Row label="IBAN" value={details.iban} />
            <Row label="Account no." value={details.accountNumber} />
            <Row label="SWIFT" value={details.swiftCode} />
            <Row label="Routing no." value={details.routingNo} />
            <Row label="Account holder" value={details.accountHolder} />
            <Row label="Payment link" value={details.paymentLink} />
          </dl>
          <p className="text-xs text-text-muted">Viewing is logged</p>
        </>
      )}
    </div>
  )
}
