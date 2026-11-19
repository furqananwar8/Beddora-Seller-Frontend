'use client'

import React, { useEffect, useRef, useState } from 'react'
import { NumericInput } from '@/components/form-field/NumericInput'
import { cn } from '@/utils/cn'

const show = (value: number | null) => (value === null || !Number.isFinite(value) ? '' : String(Math.round(value * 100) / 100))

interface CellInputProps {
  value: number | null
  /** Whether the user has changed this cell from its default (it is tinted and can be cleared). */
  edited: boolean
  /** Called with the typed number, or undefined once the cell is emptied: the cell then follows its default again. */
  onChange: (value: number | undefined) => void
  prefix?: string
  suffix?: string
  disabled?: boolean
  title?: string
  ariaLabel: string
  /** Accept a leading minus (a margin target can be below zero). Everywhere else a cell is never negative. */
  allowNegative?: boolean
}

/**
 * A number the user can type into: digits and one decimal point only, so it can never be negative. Every keystroke
 * reaches `onChange`, so the row's figures follow as the user types.
 */
export const CellInput: React.FC<CellInputProps> = ({ value, edited, onChange, prefix, suffix, disabled, title, ariaLabel, allowNegative }) => {
  const Field = allowNegative ? SignedInput : NumericInput
  const [draft, setDraft] = useState(show(value))
  const focused = useRef(false)

  // a changed default (another filter, new data) shows through unless the user is typing here
  useEffect(() => {
    if (!focused.current) setDraft(show(value))
  }, [value])

  return (
    <div
      title={title}
      className={cn(
        'flex items-center gap-1 rounded border px-1.5 py-1 text-xs',
        disabled ? 'cursor-not-allowed border-transparent bg-surface-secondary text-text-subtle' : edited ? 'border-warning-300 bg-warning-50' : 'border-border bg-surface',
        !disabled && 'focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500',
      )}
    >
      {prefix && <span className="text-text-muted">{prefix}</span>}
      <Field
        decimal
        aria-label={ariaLabel}
        disabled={disabled}
        value={draft}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false
          setDraft(show(value))
        }}
        onChange={(event) => {
          const text = event.target.value
          if (allowNegative && !/^-?\d*\.?\d*$/.test(text)) return
          setDraft(text)
          const parsed = parseFloat(text)
          if (text === '') onChange(undefined)
          else if (Number.isFinite(parsed)) onChange(parsed)
        }}
        className="w-full min-w-0 bg-transparent text-center tabular-nums outline-none disabled:cursor-not-allowed"
      />
      {suffix && <span className="text-text-muted">{suffix}</span>}
    </div>
  )
}

/** Like NumericInput but the typed text is not cleaned, so a minus sign can be typed (the cell checks it). */
const SignedInput = ({ decimal, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { decimal?: boolean }) => <input {...props} inputMode={decimal ? 'decimal' : 'numeric'} autoComplete="off" />

/** A worked-out figure; the sheet's blank (no result yet) shows as a dash. */
export const Figure: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' | 'muted'; bold?: boolean }> = ({ children, tone, bold }) => (
  <span className={cn('tabular-nums', bold && 'font-semibold', tone === 'good' && 'text-success-600', tone === 'bad' && 'text-danger-600', tone === 'muted' && 'text-text-muted')}>{children}</span>
)
