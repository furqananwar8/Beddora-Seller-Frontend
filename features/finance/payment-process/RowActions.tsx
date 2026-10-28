'use client'

import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import type { PaymentDocumentListItem } from '@/services/api/finance.api'
import { formatDocNo } from '../shared/format'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { isFinalDoc } from '../shared/statusMeta'
import { useAppAbility } from '@/hooks/useAppAbility'

export type RowAction = 'mark-paid' | 'cancel' | 'upload' | 'proofs' | 'view' | 'edit-container'

interface RowActionsProps {
  row: PaymentDocumentListItem
  onSelect: (action: RowAction) => void
}

/** Payment queue actions in the row's three-dot menu. */
export const RowActions: React.FC<RowActionsProps> = ({ row, onSelect }) => {
  const { canProcessPayments } = useFinanceCapabilities()
  const canEditContainers = useAppAbility().can('write', 'containers:containers')
  const closed = isFinalDoc(row.status)
  const showView = row.status === 'POP_UPLOADED' || closed || row.paidAmount > 0

  return (
    <RowActionsMenu
      label={formatDocNo(row.id)}
      items={[
        ...(canProcessPayments && !closed && row.balance > 0 ? [{ key: 'upload', label: 'View Request', onSelect: () => onSelect('upload') }] : []),
        ...(canProcessPayments && !closed
          ? [{ key: 'mark-paid', label: row.paidAmount > 0 && row.balance > 0 ? 'Mark paid (settle amount)' : 'Mark paid', onSelect: () => onSelect('mark-paid'), disabled: !row.canMarkPaid, disabledReason: 'Record a payment first.' }]
          : []),
        // Only a payment nothing is paid on can be cancelled; once paid it is settled instead
        ...(canProcessPayments && row.canCancel ? [{ key: 'cancel', label: 'Cancel payment', onSelect: () => onSelect('cancel') }] : []),
        // Proofs stay correctable once a payment is recorded, even after it is marked paid
        ...(canProcessPayments && row.paidAmount > 0 ? [{ key: 'proofs', label: 'Update proof of payment', onSelect: () => onSelect('proofs') }] : []),
        // The container stays editable whatever the payment's status; its own status rules still apply
        ...(canEditContainers && row.containerNo ? [{ key: 'edit-container', label: 'Edit container', onSelect: () => onSelect('edit-container') }] : []),
        ...(showView ? [{ key: 'view', label: 'View', onSelect: () => onSelect('view') }] : []),
        ...(!showView ? [{ key: 'details', label: 'View details', onSelect: () => onSelect('view') }] : []),
      ]}
    />
  )
}
