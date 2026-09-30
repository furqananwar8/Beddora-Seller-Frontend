'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { PaymentDocumentListItem, useMarkPaidMutation } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDocNo } from '../shared/format'
import { financeErrorMessage, useFinanceFeedback } from '../shared/useFinanceFeedback'

interface MarkPaidConfirmProps {
  row: PaymentDocumentListItem | null
  onClose: () => void
}

export const MarkPaidConfirm: React.FC<MarkPaidConfirmProps> = ({ row, onClose }) => {
  const feedback = useFinanceFeedback()
  const [markPaid, { isLoading }] = useMarkPaidMutation()
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setError(null)
    onClose()
  }

  const confirm = async () => {
    if (!row) return
    try {
      await markPaid(row.id).unwrap()
      feedback.success(`${formatDocNo(row.id)} marked as paid`)
      close()
    } catch (err) {
      setError(financeErrorMessage(err, 'Could not mark as paid'))
    }
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
            <Button variant="primary" onClick={confirm} isLoading={isLoading}>
              Mark paid
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
