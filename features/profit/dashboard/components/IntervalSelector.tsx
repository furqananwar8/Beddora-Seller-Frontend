'use client'

import React from 'react'
import { Select } from '@/design-system/inputs'
import { cn } from '@/utils/cn'

/**
 * IntervalSelector Component
 * 
 * Reusable component for selecting time interval (daily, weekly, monthly)
 * 
 * @example
 * <IntervalSelector
 *   value="daily"
 *   onChange={(interval) => setInterval(interval)}
 * />
 */

export type Interval = 'daily' | 'weekly' | 'monthly'

export interface IntervalSelectorProps {
  value: Interval
  onChange: (interval: Interval) => void
  className?: string
  disabled?: boolean
}

export const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  value,
  onChange,
  className,
  disabled = false,
}) => {
  return (
    <div className={cn('min-w-[140px]', className)}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as Interval)}
        disabled={disabled}
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
    </div>
  )
}
