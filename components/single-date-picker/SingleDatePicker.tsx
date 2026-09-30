'use client'

import React, { useEffect, useRef } from 'react'
import { isValid, parseISO } from 'date-fns'
import DateRangePicker from '@/components/date-range-picker/DateRangePicker'
import { cn } from '@/utils/cn'

interface SingleDatePickerProps {
  /** yyyy-mm-dd, or empty for no date. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  /** yyyy-mm-dd */
  min?: string
  /** yyyy-mm-dd */
  max?: string
  className?: string
}

const toDate = (value?: string) => {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

/** Single date field built on the app's DateRangePicker (single selection, no presets), sized like a ds-input. */
export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  value,
  onChange,
  id,
  placeholder = 'Select date',
  error,
  disabled,
  min,
  max,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  // Lets a <label htmlFor> focus the trigger button.
  useEffect(() => {
    const button = ref.current?.querySelector('button')
    if (button && id) button.id = id
  }, [id])

  return (
    <div
      ref={ref}
      className={cn(
        'w-full',
        '[&>div]:block [&>div]:w-full',
        '[&>div>button]:w-full [&>div>button]:rounded-lg [&>div>button]:py-2.5',
        '[&>div>button>span]:flex-1 [&>div>button>span]:text-left',
        error && '[&>div>button]:border-danger-400',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
    >
      <DateRangePicker
        selectionMode="single"
        showPresets={false}
        placement="left"
        placeholder={placeholder}
        displayFormat="MMM d, yyyy"
        value={{ startDate: value || null, endDate: value || null }}
        minDate={toDate(min)}
        maxDate={toDate(max)}
        onChange={(range) => onChange(range.startDate ?? '')}
      />
    </div>
  )
}
