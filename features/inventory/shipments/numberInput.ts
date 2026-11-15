import type React from 'react'

/**
 * Spread onto an `<input type="number">` that holds a count or a measurement: it can never be negative, and a whole-number
 * field takes no decimal point. `min` on the input is only a hint, so without this a user can still type or paste "-5".
 * Validation stays where it was; this only stops the bad value from being entered in the first place.
 */
export function nonNegativeNumber(allowDecimal = false) {
  const blocked = allowDecimal ? ['-', '+', 'e', 'E'] : ['-', '+', 'e', 'E', '.', ',']
  return {
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (blocked.includes(e.key)) e.preventDefault()
    },
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text').trim()
      if (!(allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/).test(text)) e.preventDefault()
    },
  }
}
