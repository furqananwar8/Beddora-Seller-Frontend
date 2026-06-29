'use client'

import React from 'react'
import { Input } from '@/design-system/inputs'

/**
 * DateRangeFilter component - Filter component
 * Simple date range picker (you can enhance this with a proper date picker library)
 */

export interface DateRangeFilterProps {
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  className?: string
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}) => {
  return (
    <div className={`flex gap-4 ${className}`}>
      <Input
        type="date"
        label="Start Date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
      />
      <Input
        type="date"
        label="End Date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
      />
    </div>
  )
}

