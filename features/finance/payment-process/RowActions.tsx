'use client'

import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import type { PaymentDocumentListItem } from '@/services/api/finance.api'
import { formatDocNo } from '../shared/format'

export type RowAction = 'mark-paid' | 'upload' | 'view'

interface RowActionsProps {
  row: PaymentDocumentListItem
  onSelect: (action: RowAction) => void
}

/** Payment queue actions in the row's three-dot menu. */
export const RowActions: React.FC<RowActionsProps> = ({ row, onSelect }) => {
  const showView = row.status === 'POP_UPLOADED' || row.status === 'PAID' || row.paidAmount > 0

  return (
    <RowActionsMenu
      label={formatDocNo(row.id)}
      items={[
        ...(row.status !== 'PAID' ? [{ key: 'upload', label: 'Upload POP', onSelect: () => onSelect('upload') }] : []),
        { key: 'mark-paid', label: 'Mark paid', onSelect: () => onSelect('mark-paid'), disabled: !row.canMarkPaid, disabledReason: 'Upload proof of payment first.' },
        ...(showView ? [{ key: 'view', label: 'View POP', onSelect: () => onSelect('view') }] : []),
      ]}
    />
  )
}
