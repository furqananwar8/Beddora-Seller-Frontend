import React from 'react'
import { amount, breakdownLines, money } from '../shippingMeta'
import type { Incoterm, PriceBreakdown } from '../types'

interface PriceBreakdownTableProps {
  price: PriceBreakdown
  incoterm: Incoterm
  total: number
  currency: string
}

/** Base rate, each surcharge, duties and taxes, then the total. */
export const PriceBreakdownTable: React.FC<PriceBreakdownTableProps> = ({ price, incoterm, total, currency }) => (
  <table className="w-full text-sm">
    <tbody>
      {breakdownLines(price, incoterm).map((line, index) => (
        <tr key={`${line.label}-${index}`} className="border-b border-border">
          <td className="py-1.5 text-text-muted">{line.label}</td>
          <td className="py-1.5 text-right tabular-nums">{typeof line.amount === 'number' ? amount(line.amount) : line.amount}</td>
        </tr>
      ))}
      <tr>
        <td className="pt-2 font-semibold text-text-primary">Total</td>
        <td className="pt-2 text-right text-base font-semibold tabular-nums text-text-primary">{money(total, currency)}</td>
      </tr>
    </tbody>
  </table>
)
