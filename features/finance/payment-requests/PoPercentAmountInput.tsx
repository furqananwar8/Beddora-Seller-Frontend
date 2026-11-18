'use client'

import React from 'react'
import { Input } from '@/design-system/inputs'
import { AmountInput } from '../shared/AmountInput'
import { formatMoney } from '../shared/format'
import { sanitizeAmount } from '../shared/money'
import { parseAmount } from './schema'

/** The amount a percentage of the PO's total comes to, rounded to the cent; '' while the percentage is empty or not a number. */
export const amountFromPercent = (percent: string, total: number): string => {
  const value = parseAmount(percent)
  return percent.trim() === '' || !Number.isFinite(value) ? '' : formatMoney(Math.round(total * value) / 100)
}

type AmountInputProps = React.ComponentProps<typeof AmountInput>

interface PoPercentAmountInputProps extends Omit<AmountInputProps, 'value' | 'onValueChange'> {
  /** The line's amount as text; the form always holds the amount, whichever way it was typed. */
  value: string
  onValueChange: (amount: string) => void
  /** The % of the PO the amount was entered as; empty for a manual amount. Held by the form, so it is saved with the request. */
  percent: string
  onPercentChange: (percent: string) => void
  /** The PO's total value, which the percentage is of; 0 until a PO is picked, which leaves the percentage disabled. */
  poTotal: number
}

/**
 * An amount with a percentage of the purchase order's total beside it. Typing a percentage fills the amount in; typing
 * the amount itself is a manual entry and puts the percentage back to empty (0). The request records which way each
 * amount was entered; GST, totals and the PO cap work on the amount as before.
 */
export const PoPercentAmountInput = React.forwardRef<HTMLInputElement, PoPercentAmountInputProps>(({ value, onValueChange, percent, onPercentChange, poTotal, ...rest }, ref) => {
  const typePercent = (text: string) => {
    onPercentChange(text)
    onValueChange(amountFromPercent(text, poTotal))
  }

  const typeAmount = (text: string) => {
    // Leaving the field re-formats the same figure as money: that is not an edit
    if (parseAmount(text) !== parseAmount(value)) onPercentChange('')
    onValueChange(text)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <AmountInput {...rest} ref={ref} value={value} onValueChange={typeAmount} />
      </div>
      <div className="sm:w-[5.5rem] sm:shrink-0">
        {/* The column header names it from `sm` up; stacked, each row names its own */}
        <label htmlFor={`${rest.id}-percent`} className="ds-input-label mb-1 block sm:sr-only">
          Percentage
        </label>
        <div className="relative">
          <Input
            id={`${rest.id}-percent`}
            inputMode="decimal"
            autoComplete="off"
            title={poTotal > 0 ? 'Percentage of the PO amount' : 'Pick the purchase order first'}
            placeholder="0"
            className="rounded-lg pr-6 text-right"
            disabled={poTotal <= 0}
            value={percent}
            onChange={(event) => typePercent(sanitizeAmount(event.target.value))}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-text-muted">%</span>
        </div>
      </div>
    </div>
  )
})
PoPercentAmountInput.displayName = 'PoPercentAmountInput'
