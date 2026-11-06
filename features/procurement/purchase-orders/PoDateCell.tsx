'use client'

import React from 'react'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { formatCalendarDay } from '@/utils/format'

export const toDay = (value: string | null): string => (value ? value.slice(0, 10) : '')

interface PoDateCellProps {
  id: string
  poNo: string
  /** What the date is called in messages, e.g. "ARD". */
  label: string
  value: string | null
  /** False renders the plain date (or a dash): the user may not set it right now. */
  editable: boolean
  /** Why it cannot be set yet; shown as a tooltip on the empty value. */
  lockedReason?: string
  min?: string
  max?: string
  /** Saves the new day; an empty string means cleared. */
  onSave: (value: string) => Promise<unknown>
  /** Whether the date can be cleared once set. */
  clearable?: boolean
}

/** A PO date picked in place in the list and saved straight away; read-only while `editable` is false. */
export const PoDateCell: React.FC<PoDateCellProps> = ({ id, poNo, label, value, editable, lockedReason, min, max, onSave, clearable = true }) => {
  const [saving, setSaving] = React.useState(false)
  const { success, failure } = useApiFeedback()

  if (!editable) {
    return (
      <span className="whitespace-nowrap" title={value ? undefined : lockedReason}>
        {value ? formatCalendarDay(value) : '—'}
      </span>
    )
  }

  const save = async (next: string) => {
    if (next === toDay(value) || (!next && !clearable)) return
    setSaving(true)
    try {
      await onSave(next)
      success(next ? `${poNo} ${label} set to ${formatCalendarDay(next)}` : `${poNo} ${label} cleared`)
    } catch (error) {
      failure(error, `Could not save the ${label}`)
    } finally {
      setSaving(false)
    }
  }

  return <SingleDatePicker id={id} value={toDay(value)} onChange={(next) => void save(next)} min={min} max={max} placeholder="Select Date" disabled={saving} className="min-w-[9.5rem]" />
}
