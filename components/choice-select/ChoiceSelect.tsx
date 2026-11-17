'use client'

import React from 'react'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { cn } from '@/utils/cn'

export interface Choice<T extends string> {
  value: T
  label: string
}

interface ChoiceSelectProps<T extends string> {
  id?: string
  /** What the field is called; the Planner-style trigger and the screen-reader name use it. */
  title: string
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<Choice<T>>
  disabled?: boolean
  /**
   * `field`: the Inventory Planner's dropdown, for form fields.
   * `cell`: the app's searchable dropdown without a search box, for table cells (its panel is not clipped by the table).
   */
  variant?: 'field' | 'cell'
  className?: string
}

/** A short single-choice dropdown (a few fixed options) in the app's dropdown style, instead of a native <select>. */
export function ChoiceSelect<T extends string>({ id, title, value, onChange, options, disabled, variant = 'field', className }: ChoiceSelectProps<T>) {
  if (variant === 'cell') {
    return (
      <SearchableSelect<Choice<T>>
        id={id}
        value={options.find((option) => option.value === value) ?? null}
        onChange={(option) => onChange(option.value)}
        options={[...options]}
        getKey={(option) => option.value}
        getLabel={(option) => option.label}
        searchable={false}
        disabled={disabled}
        ariaLabel={title}
        className={className}
      />
    )
  }
  return (
    // The planner's dropdown has a 160px minimum; a form column may be narrower, so the field shrinks to its column
    <div className={cn('[&>div]:min-w-0', disabled && 'pointer-events-none opacity-60', className)} aria-disabled={disabled || undefined}>
      <MultiSelectInput single title={title} options={options.map((option) => ({ id: option.value, name: option.label }))} value={[value]} onChange={(next) => onChange((next[0] ?? value) as T)} className="w-full" />
    </div>
  )
}
