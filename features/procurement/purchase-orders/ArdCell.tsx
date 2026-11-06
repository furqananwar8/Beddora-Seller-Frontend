'use client'

import React from 'react'
import { useSetPurchaseOrderArdMutation, type PurchaseOrderListItem } from '@/services/api/procurement.api'
import { canSetArd } from '../shared/poMeta'
import { PoDateCell, toDay } from './PoDateCell'

/** ARD (actual ready date): editable only with the PO edit permission, once the PO is in production and while it is open. */
export const ArdCell: React.FC<{ row: PurchaseOrderListItem; canEdit: boolean }> = ({ row, canEdit }) => {
  const [setArd] = useSetPurchaseOrderArdMutation()
  return (
    <PoDateCell
      id={`po-ard-${row.id}`}
      poNo={row.poNo}
      label="ARD"
      value={row.ard}
      editable={canEdit && canSetArd(row)}
      lockedReason="Available once the PO is in production"
      min={row.productionDate ? toDay(row.productionDate) : undefined}
      onSave={(value) => setArd({ id: row.id, ard: value || null }).unwrap()}
    />
  )
}
