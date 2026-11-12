'use client'

import React from 'react'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useSetContainerShippedOnBoardMutation, type ContainerItem } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'

interface ShippedOnBoardCellProps {
  container: ContainerItem
  /** Whether the viewer may change containers. */
  canWrite: boolean
}

/**
 * "Shipped on board": a date picked straight from the table and saved as soon as it is chosen. It is entered by hand,
 * and read-only once the container is delivered (the server locks it with the rest of the form).
 */
export const ShippedOnBoardCell: React.FC<ShippedOnBoardCellProps> = ({ container, canWrite }) => {
  const { success, failure } = useApiFeedback()
  const [save, { isLoading }] = useSetContainerShippedOnBoardMutation()
  const editable = canWrite && container.permissions.editableFields.includes('shippedOnBoardAt')
  const value = container.shippedOnBoardAt ? container.shippedOnBoardAt.slice(0, 10) : ''

  if (!editable) return <span className="whitespace-nowrap text-sm">{container.shippedOnBoardAt ? formatCalendarDay(container.shippedOnBoardAt) : '—'}</span>

  const change = async (next: string) => {
    if (next === value) return
    try {
      await save({ id: container.id, shippedOnBoardAt: next || null }).unwrap()
      success('Shipped on board date saved')
    } catch (error) {
      failure(error, 'Could not save the shipped on board date')
    }
  }

  return (
    <div className="mx-auto w-40">
      <SingleDatePicker
        id={`board-${container.id}`}
        value={value}
        onChange={(next) => void change(next)}
        placeholder="Select date"
        disabled={isLoading}
        className="[&>div>button]:py-1.5 [&>div>button]:text-sm"
      />
    </div>
  )
}
