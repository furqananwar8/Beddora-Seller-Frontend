import React, { useState, useRef, useMemo, useEffect } from 'react'

export interface MultiSelectOption {
  id: string
  name: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  title: string
  placeholder?: string
  className?: string
  single?: boolean
}

export const MultiSelectInput: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  title,
  placeholder,
  className = '',
  single = false,
}) => {
  const [open, setOpen] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allIds = useMemo(() => options.map((o) => o.id), [options])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleSingle = (id: string) => {
    onChange([id])
    setOpen(false)
  }

  const toggleOne = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const toggleAll = () => {
    const allSelected = value.length === allIds.length && allIds.length > 0
    if (allSelected) {
      onChange([])
    } else {
      onChange([...allIds])
    }
  }

  const displayLabel = useMemo(() => {
    if (value.length === 0) return placeholder || `Select ${title.toLowerCase()}`
    if (single) {
      return options.find((o) => o.id === value[0])?.name || placeholder || `Select ${title.toLowerCase()}`
    }
    if (value.length === 1) {
      return options.find((o) => o.id === value[0])?.name || placeholder || `Select ${title.toLowerCase()}`
    }
    if (value.length === options.length) return `All ${title}s`
    return `${value.length} selected`
  }, [value, options, placeholder, title, single])

  const allSelected = value.length === allIds.length && allIds.length > 0

  return (
    <div className={`relative min-w-[160px] ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg shadow-lg py-1">
          {/* Multi-select only: "All" row with checkbox */}
          {!single && (
            <label className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border cursor-pointer hover:bg-surface-secondary">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span className="text-sm font-medium text-text-primary">All {title}s</span>
            </label>
          )}

          {options.map((opt) => {
            const isSelected = value.includes(opt.id)

            return (
              <div
                key={opt.id}
                onClick={() => (single ? toggleSingle(opt.id) : toggleOne(opt.id))}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-secondary"
              >
                {/* Left side: green checkmark for single-select, checkbox for multi-select */}
                {single ? (
                  isSelected ? (
                    <svg
                      className="w-4 h-4 text-success-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0" />
                  )
                ) : (
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                    checked={isSelected}
                    onChange={() => toggleOne(opt.id)}
                  />
                )}

                {/* Right side: text */}
                <span className={`text-sm ${isSelected ? 'font-medium text-text-primary' : 'text-text-primary'}`}>
                  {opt.name}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}