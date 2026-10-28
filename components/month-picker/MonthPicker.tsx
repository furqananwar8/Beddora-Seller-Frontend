'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `YYYY-MM`. */
export type MonthValue = string

export const monthValue = (year: number, monthIndex: number): MonthValue => `${year}-${String(monthIndex + 1).padStart(2, '0')}`
export const currentMonth = (): MonthValue => monthValue(new Date().getFullYear(), new Date().getMonth())
export const monthLabel = (value: MonthValue): string => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

interface MonthPickerProps {
  value: MonthValue
  onChange: (value: MonthValue) => void
  /** Months after it cannot be picked. */
  max?: MonthValue
}

/** A year with its twelve months: step the year, pick a month. */
export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, max }) => {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const maxYear = max ? Number(max.slice(0, 4)) : Infinity

  return (
    <div className="w-full rounded-lg border border-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded p-1 text-text-secondary hover:bg-secondary-50" aria-label="Previous year">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-text-primary">{year}</span>
        <button type="button" onClick={() => setYear((y) => y + 1)} disabled={year >= maxYear} className="rounded p-1 text-text-secondary hover:bg-secondary-50 disabled:opacity-30" aria-label="Next year">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MONTHS.map((label, index) => {
          const month = monthValue(year, index)
          const disabled = Boolean(max && month > max)
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              aria-pressed={month === value}
              onClick={() => onChange(month)}
              className={cn(
                'rounded-md border px-2 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                month === value ? 'border-primary-600 bg-primary-600 font-semibold text-white' : 'border-border text-text-primary hover:bg-secondary-50',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
