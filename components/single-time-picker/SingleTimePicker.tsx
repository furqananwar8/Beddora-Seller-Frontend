'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { cn } from '@/utils/cn'
import { TIME_ZONES, formatTime, parseTime, timeLabel, timeOptions } from './time'

interface SingleTimePickerProps {
  /** "13:00 EDT", "13:00", or empty for no time. */
  value: string
  onChange: (value: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

const NO_TIME = ''

/**
 * A time of day with an optional zone, in the app's dropdown style (the time counterpart of SingleDatePicker): times
 * every 15 minutes, filtered as you type ("2:30" or "pm"), and a zone beside it.
 */
export const SingleTimePicker: React.FC<SingleTimePickerProps> = ({ value, onChange, id, ariaLabel = 'Time', placeholder = 'Pick a time', error, disabled, className }) => {
  const { time, zone } = parseTime(value)
  return (
    <div className={cn('flex gap-2', className)}>
      <SearchableSelect<string>
        id={id}
        ariaLabel={ariaLabel}
        className="min-w-0 flex-1"
        value={time || null}
        onChange={(next) => onChange(formatTime(next, zone))}
        options={[NO_TIME, ...timeOptions(time)]}
        getKey={(option) => option || 'none'}
        getLabel={(option) => (option ? timeLabel(option) : 'No time')}
        searchable
        searchPlaceholder="Type a time, e.g. 2:30"
        placeholder={placeholder}
        error={error}
        disabled={disabled}
      />
      <SearchableSelect<string>
        ariaLabel={`${ariaLabel} zone`}
        className="w-28 shrink-0"
        value={zone || null}
        onChange={(next) => onChange(formatTime(time, next))}
        options={[NO_TIME, ...TIME_ZONES]}
        getKey={(option) => option || 'none'}
        getLabel={(option) => option || 'No zone'}
        searchable={false}
        placeholder="Zone"
        disabled={disabled || !time}
      />
    </div>
  )
}
