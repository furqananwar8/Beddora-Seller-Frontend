'use client'

import React from 'react'
import { useSetPurchaseOrderProductionDateMutation, type PurchaseOrderListItem } from '@/services/api/procurement.api'
import { canSetProductionDate } from '../shared/poMeta'
import { PoDateCell, toDay } from './PoDateCell'

/** Production date: editable only with the PO edit permission, once the PO is approved and while it is open. Setting it puts the PO in production. */
export const ProductionDateCell: React.FC<{ row: PurchaseOrderListItem; canEdit: boolean }> = ({ row, canEdit }) => {
  const [setProductionDate] = useSetPurchaseOrderProductionDateMutation()
  return (
    <PoDateCell
      id={`po-production-${row.id}`}
      poNo={row.poNo}
      label="production date"
      value={row.productionDate}
      editable={canEdit && canSetProductionDate(row)}
      lockedReason="Available once the PO is approved"
      max={row.ard ? toDay(row.ard) : undefined}
      clearable={false}
      onSave={(value) => setProductionDate({ id: row.id, productionDate: value }).unwrap()}
    />
  )
}
