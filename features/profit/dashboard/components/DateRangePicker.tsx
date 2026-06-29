'use client'

import React from 'react'
import { Input } from '@/design-system/inputs'
import { cn } from '@/utils/cn'

/**
 * DateRangePicker Component
 * 
 * Reusable component for selecting start and end dates
 * 
 * @example
 * <DateRangePicker
 *   startDate="2024-01-01"
 *   endDate="2024-12-31"
 *   onStartDateChange={(date) => setStartDate(date)}
 *   onEndDateChange={(date) => setEndDate(date)}
 * />
 */

export interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  className?: string
  disabled?: boolean
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  disabled = false,
}) => {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Validate that start date is not after end date
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value
    if (newStartDate <= endDate) {
      onStartDateChange(newStartDate)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value
    if (newEndDate >= startDate) {
      onEndDateChange(newEndDate)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <label htmlFor="start-date" className="text-sm font-medium text-text-secondary whitespace-nowrap">
          Start Date:
        </label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          max={endDate || today}
          disabled={disabled}
          className="w-[160px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="end-date" className="text-sm font-medium text-text-secondary whitespace-nowrap">
          End Date:
        </label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          min={startDate}
          max={today}
          disabled={disabled}
          className="w-[160px]"
        />
      </div>
    </div>
  )
}
