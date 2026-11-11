import React from 'react'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { OriginalAmounts } from '@/services/api/procurement.api'

/** Adds up original amounts per currency (e.g. every expense column of a container). */
export const mergeOriginals = (...lists: Array<OriginalAmounts | undefined>): OriginalAmounts => {
  const merged: OriginalAmounts = {}
  for (const list of lists) for (const [currency, amount] of Object.entries(list ?? {})) merged[currency] = (merged[currency] ?? 0) + amount
  return merged
}

/**
 * What a converted amount was before conversion, in brackets after it: "5,992.50 (USD 4,250.00)". Shows nothing
 * for an amount that was never converted.
 */
export const OriginalAmount: React.FC<{ amounts?: OriginalAmounts }> = ({ amounts }) => {
  const parts = Object.entries(amounts ?? {})
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => formatCurrencyAmount(currency, amount))
  if (parts.length === 0) return null
  return <span className="ml-1 text-text-muted">({parts.join(' + ')})</span>
}
