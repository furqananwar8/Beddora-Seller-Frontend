'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { PaymentDocumentListItem, useMarkPaidMutation } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDocNo } from '../shared/format'
import { financeErrorMessage, useFinanceFeedback } from '../shared/useFinanceFeedback'

interface MarkPaidConfirmProps {
  row: PaymentDocumentListItem | null
  onClose: () => void
}

/**
 * "Mark paid". Paid in full it just confirms; with a balance still outstanding it settles the amount
 * (AMOUNT SETTLED), which asks for the reason first.
 */
export const MarkPaidConfirm: React.FC<MarkPaidConfirmProps> = ({ row, onClose }) => {
  const feedback = useFinanceFeedback()
  const [markPaid, { isLoading }] = useMarkPaidMutation()
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setError(null)
    onClose()
  }

  const submit = async (reason?: string): Promise<boolean> => {
    if (!row) return false
    try {
      await markPaid({ id: row.id, reason }).unwrap()
      feedback.success(reason ? `${formatDocNo(row.id)} settled` : `${formatDocNo(row.id)} marked as paid`)
      close()
      return true
    } catch (err) {
      const message = financeErrorMessage(err, 'Could not mark as paid')
      if (reason) feedback.failure(err, message)
      else setError(message)
      return false
    }
  }

  if (row && row.balance > 0) {
    return (
      <ReasonDialog
        isOpen
        title="Settle amount"
        description={`${formatDocNo(row.id)} has ${formatCurrencyAmount(row.currency, row.balance)} outstanding (paid ${formatCurrencyAmount(row.currency, row.paidAmount)} of ${formatCurrencyAmount(row.currency, row.amount)}). It will be closed as AMOUNT SETTLED.`}
        confirmLabel="Mark as settled"
        placeholder="Why is the remaining balance not being paid?"
        submitting={isLoading}
        onConfirm={(reason) => submit(reason)}
        onClose={close}
      />
    )
  }

  return (
    <Modal isOpen={!!row} onClose={close} title="Mark as paid" size="sm">
      {row && (
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Mark {formatDocNo(row.id)} as paid? Paid {formatCurrencyAmount(row.currency, row.paidAmount)} of {formatCurrencyAmount(row.currency, row.amount)}.
          </p>
          {error && (
            <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => submit()} isLoading={isLoading}>
              Mark paid
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
