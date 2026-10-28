'use client'

import React from 'react'
import { useGetContainerCostMappingQuery, useSaveContainerCostMappingMutation } from '@/services/api/procurement.api'
import { ExpenseMappingModal } from '../expense-mapping/ExpenseMappingModal'

/** "Map expenses" on Cost Analysis: the L4 cost centers each container expense column takes its payments from. */
export const CostMappingModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data, isLoading } = useGetContainerCostMappingQuery(undefined, { skip: !open })
  const [save, { isLoading: saving }] = useSaveContainerCostMappingMutation()
  return (
    <ExpenseMappingModal
      open={open}
      onClose={onClose}
      description="Each column takes the approved payment requests of its container booked to any of the L4 cost centers picked here. An L4 can feed one column only. Renaming a cost center keeps the mapping."
      mapping={data}
      isLoading={isLoading}
      saving={saving}
      onSave={(entries) => save(entries).unwrap()}
    />
  )
}
