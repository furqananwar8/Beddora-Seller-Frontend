'use client'

import React, { useState } from 'react'
import { Input } from '@/design-system/inputs'
import { formatMoney } from './format'
import { sanitizeAmount } from './money'

type AmountInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  /** The amount as text ("12,450.50"). */
  value: string
  onValueChange: (value: string) => void
}

/**
 * A money field that takes positive numbers only (digits and one point, 2 decimals): anything else typed or pasted is dropped.
 * While it has focus it shows what is being typed, even if the owner rewrites `value`; on leaving it shows the amount as money.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(({ value, onValueChange, onBlur, className, ...rest }, ref) => {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      {...rest}
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={draft ?? value}
      onChange={(event) => {
        const next = sanitizeAmount(event.target.value)
        setDraft(next)
        onValueChange(next)
      }}
      onBlur={(event) => {
        const parsed = Number(draft ?? value.replace(/,/g, ''))
        setDraft(null)
        if ((draft ?? value).trim() && Number.isFinite(parsed)) onValueChange(formatMoney(parsed))
        onBlur?.(event)
      }}
    />
  )
})
AmountInput.displayName = 'AmountInput'
