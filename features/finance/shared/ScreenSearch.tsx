'use client'

import React from 'react'

interface ScreenSearchProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
}

/** The screen's own search box (the global header no longer carries one). Same look as the Adjustments search. */
export const ScreenSearch: React.FC<ScreenSearchProps> = ({ placeholder, value, onChange }) => (
  <input
    type="search"
    placeholder={placeholder}
    aria-label={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="mb-4 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 sm:max-w-md"
  />
)
