'use client'

import React from 'react'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useSetPurchaseOrderArdMutation, type PurchaseOrderListItem } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'

const day = (value: string | null) => (value ? value.slice(0, 10) : '')

/** ARD (actual ready date) in the list, picked in place and saved straight away; read-only without write access. */
export const ArdCell: React.FC<{ row: PurchaseOrderListItem; canWrite: boolean }> = ({ row, canWrite }) => {
  const [setArd, { isLoading }] = useSetPurchaseOrderArdMutation()
  const { success, failure } = useApiFeedback()

  if (!canWrite) return <span className="whitespace-nowrap">{row.ard ? formatCalendarDay(row.ard) : '—'}</span>

  const save = async (value: string) => {
    if (value === day(row.ard)) return
    try {
      await setArd({ id: row.id, ard: value || null }).unwrap()
      success(value ? `${row.poNo} ARD set to ${formatCalendarDay(value)}` : `${row.poNo} ARD cleared`)
    } catch (error) {
      failure(error, 'Could not save the ARD')
    }
  }

  return (
    <SingleDatePicker
      id={`po-ard-${row.id}`}
      value={day(row.ard)}
      onChange={(value) => void save(value)}
      min={row.productionDate ? day(row.productionDate) : undefined}
      placeholder="Set ARD"
      disabled={isLoading}
      className="min-w-[9.5rem]"
    />
  )
}
