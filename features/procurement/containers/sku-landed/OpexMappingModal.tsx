'use client'

import React from 'react'
import { useGetSkuLandedMappingQuery, useSaveSkuLandedMappingMutation } from '@/services/api/procurement.api'
import { ExpenseMappingModal } from '../expense-mapping/ExpenseMappingModal'

/** "Map expense columns" on SKU Landed: the L4 cost centers whose approved payments count as 3PL in opex. */
export const OpexMappingModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data, isLoading } = useGetSkuLandedMappingQuery(undefined, { skip: !open })
  const [save, { isLoading: saving }] = useSaveSkuLandedMappingMutation()
  return (
    <ExpenseMappingModal
      open={open}
      onClose={onClose}
      description="Each column takes the approved payment requests booked to any of the L4 cost centers picked here, summed per month by invoice date. An L4 can feed one column only, here or on Cost Analysis."
      mapping={data}
      isLoading={isLoading}
      saving={saving}
      onSave={(entries) => save(entries).unwrap()}
    />
  )
}
