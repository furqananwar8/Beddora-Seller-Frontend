'use client'

import React from 'react'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'

interface RejectDialogProps {
  /** Request being rejected; null keeps the dialog closed. */
  requestId: number | null
  submitting: boolean
  onConfirm: (id: number, reason: string) => Promise<boolean>
  onClose: () => void
}

export const RejectDialog: React.FC<RejectDialogProps> = ({ requestId, submitting, onConfirm, onClose }) => (
  <ReasonDialog
    isOpen={requestId !== null}
    title={`Reject Payment#${requestId}?`}
    description="The requester will be notified with your reason."
    confirmLabel="Reject request"
    submitting={submitting}
    onConfirm={(reason) => onConfirm(requestId!, reason)}
    onClose={onClose}
  />
)
