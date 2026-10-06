'use client'

import React, { useState } from 'react'
import { fieldClass, selectClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useGetPoProductSummaryQuery } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { colorOptions } from './colors'

const ADD_CUSTOM = '__add_custom__'

interface ColorSelectProps {
  id?: string
  value: string
  onChange: (color: string) => void
  error?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * The one color picker: common colors and the ones already used on products, plus "Add custom color…"
 * which asks for the name in a modal without leaving the screen. A native select, so the list is never
 * clipped inside a scrolling table.
 */
export const ColorSelect: React.FC<ColorSelectProps> = ({ id, value, onChange, error, disabled, className, 'aria-label': ariaLabel }) => {
  const { data: summary } = useGetPoProductSummaryQuery()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)

  const options = colorOptions(summary?.colors ?? [], value)

  const confirm = () => {
    const name = draft.trim()
    if (!name) return setDraftError('Enter a color')
    if (name.length > 60) return setDraftError('Color is too long')
    // An existing color of that name (any case) is picked instead of duplicated
    onChange(options.find((color) => color.toLowerCase() === name.toLowerCase()) ?? name)
    setAdding(false)
  }

  return (
    <>
      <div className="relative">
        <select
          id={id}
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          className={cn(selectClass(error), className)}
          onChange={(event) => {
            if (event.target.value === ADD_CUSTOM) {
              setDraft('')
              setDraftError(null)
              setAdding(true)
              return
            }
            onChange(event.target.value)
          }}
        >
          <option value="">Select color</option>
          {options.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
          <option value={ADD_CUSTOM}>+ Add custom color…</option>
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add custom color" size="sm" closeOnEscape>
        {/* A div, not a form: this modal sits inside the product form and forms cannot nest */}
        <div
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            event.stopPropagation()
            confirm()
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label htmlFor="custom-color-name" className="ds-input-label">
              Color name
            </label>
            <input
              id="custom-color-name"
              autoFocus
              autoComplete="off"
              maxLength={60}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={fieldClass(draftError ?? undefined)}
              placeholder="e.g. Sage green"
            />
            {draftError && <p className="mt-1 text-xs text-danger-600">{draftError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirm}>
              Add color
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
