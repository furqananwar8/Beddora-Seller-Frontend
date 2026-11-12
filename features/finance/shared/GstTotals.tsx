import React from 'react'
import type { GstType } from '@/services/api/finance.api'
import { splitGst, type GstInput } from './gst'
import { formatCurrencyAmount } from './format'

interface GstTotalsProps {
  currency: string
  /** Each amount as entered, with the GST % picked for it. */
  entered: GstInput[]
  type: GstType
}

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={strong ? 'flex justify-between gap-6 border-t border-border pt-1 font-semibold text-text-primary' : 'flex justify-between gap-6 text-text-secondary'}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)

/** What the amounts come to across all lines: before GST, the GST, and the total that is paid. Always shown, even for one amount. */
export const GstTotals: React.FC<GstTotalsProps> = ({ currency, entered, type }) => {
  const { net, gst, total } = splitGst(entered, type)
  const money = (value: number) => formatCurrencyAmount(currency || '—', value)
  const applies = type !== 'NOT_APPLICABLE'
  return (
    <div className="ml-auto mt-3 w-full max-w-xs space-y-1 text-sm" aria-label="Request total">
      {applies && <Row label="Amount before GST" value={money(net)} />}
      {applies && <Row label={type === 'INCLUSIVE' ? 'GST (included)' : 'GST'} value={money(gst)} />}
      <Row label="Total" value={money(total)} strong />
    </div>
  )
}
