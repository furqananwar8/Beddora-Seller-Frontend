'use client'

import React from 'react'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { PaymentDocumentListItem, useCancelPaymentMutation } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDocNo } from '../shared/format'
import { financeErrorMessage, useFinanceFeedback } from '../shared/useFinanceFeedback'

interface CancelPaymentDialogProps {
  row: PaymentDocumentListItem | null
  onClose: () => void
}

/** "Cancel payment": only while nothing is paid on it, and always with the reason. */
export const CancelPaymentDialog: React.FC<CancelPaymentDialogProps> = ({ row, onClose }) => {
  const feedback = useFinanceFeedback()
  const [cancel, { isLoading }] = useCancelPaymentMutation()

  const submit = async (reason: string): Promise<boolean> => {
    if (!row) return false
    try {
      await cancel({ id: row.id, reason }).unwrap()
      feedback.success(`${formatDocNo(row.id)} cancelled`)
      onClose()
      return true
    } catch (err) {
      feedback.failure(err, financeErrorMessage(err, 'Could not cancel the payment'))
      return false
    }
  }

  return (
    <ReasonDialog
      isOpen={row !== null}
      title="Cancel payment"
      description={
        row
          ? `${formatDocNo(row.id)} · ${row.partner.name} · ${formatCurrencyAmount(row.currency, row.amount)} will be cancelled. It will no longer be paid or counted as owed.`
          : undefined
      }
      confirmLabel="Cancel payment"
      placeholder="Why is this payment cancelled?"
      minLength={3}
      submitting={isLoading}
      onConfirm={submit}
      onClose={onClose}
    />
  )
}
