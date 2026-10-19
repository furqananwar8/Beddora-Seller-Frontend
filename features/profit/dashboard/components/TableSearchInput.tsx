'use client'

import React from 'react'

interface TableSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** The compact search box in a products table's header bar, with a clear button once something is typed. */
export function TableSearchInput({ value, onChange, placeholder = 'Search by SKU, ASIN, Title...' }: TableSearchInputProps) {
  return (
    <div className="relative min-w-[240px] sm:w-72">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-secondary/50 border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
