'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Tooltip } from '@/design-system/tooltips'
import type { PaymentDocumentListItem } from '@/services/api/finance.api'

export type RowAction = 'mark-paid' | 'upload' | 'view'

interface RowActionsProps {
  row: PaymentDocumentListItem
  onSelect: (action: RowAction) => void
}

export const RowActions: React.FC<RowActionsProps> = ({ row, onSelect }) => {
  const showView = row.status === 'POP_UPLOADED' || row.status === 'PAID' || row.paidAmount > 0

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {row.canMarkPaid ? (
        <Button size="sm" variant="outline" onClick={() => onSelect('mark-paid')}>
          Mark paid
        </Button>
      ) : (
        <Tooltip content="Upload proof of payment first.">
          <Button size="sm" variant="outline" disabled>
            Mark paid
          </Button>
        </Tooltip>
      )}
      {row.status !== 'PAID' && (
        <Button size="sm" variant="primary" onClick={() => onSelect('upload')}>
          Upload POP
        </Button>
      )}
      {showView && (
        <Button size="sm" variant="ghost" onClick={() => onSelect('view')}>
          View POP
        </Button>
      )}
    </div>
  )
}
