'use client'

import React from 'react'

interface SelectionCheckboxProps {
  checked: boolean
  /** Some but not all rows are ticked (header checkbox). */
  indeterminate?: boolean
  onChange: () => void
  label: string
}

/** A row or "select all" checkbox inside a clickable table row: ticking it does not open the row. */
export const SelectionCheckbox: React.FC<SelectionCheckboxProps> = ({ checked, indeterminate = false, onChange, label }) => (
  <input
    type="checkbox"
    aria-label={label}
    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600"
    checked={checked}
    ref={(el) => {
      if (el) el.indeterminate = indeterminate
    }}
    onChange={onChange}
    onClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
  />
)
