import React from 'react'
import type { GstType } from '@/services/api/finance.api'
import { AmountInput } from './AmountInput'
import { splitGst, type GstInput } from './gst'
import { formatCurrencyAmount, formatMoney } from './format'

interface GstTotalsProps {
  currency: string
  /** Each amount as entered, with the GST % picked for it. */
  entered: GstInput[]
  type: GstType
  /** Given, the total GST can be typed in (the owner spreads it over the amounts); otherwise it is only shown. */
  onGstChange?: (gst: string) => void
}

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={strong ? 'flex justify-between gap-4 border-t border-border pt-1 font-semibold text-text-primary' : 'flex justify-between gap-4 text-text-secondary'}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)

/** What the amounts come to across all lines: before GST, the GST, and the total that is paid. Always shown, even for one amount. */
export const GstTotals: React.FC<GstTotalsProps> = ({ currency, entered, type, onGstChange }) => {
  const { net, gst, total } = splitGst(entered, type)
  const money = (value: number) => formatCurrencyAmount(currency || '—', value)
  const applies = type !== 'NOT_APPLICABLE'
  const gstLabel = type === 'INCLUSIVE' ? 'GST (included)' : 'GST'
  return (
    <div className="ml-auto mt-2 w-full max-w-xs space-y-0.5 text-sm" aria-label="Request total">
      {applies && <Row label="Amount before GST" value={money(net)} />}
      {applies &&
        (onGstChange ? (
          <div className="flex items-center justify-between gap-4 text-text-secondary">
            <label htmlFor="request-total-gst" className="whitespace-nowrap">
              {gstLabel} {currency && <span className="text-text-muted">({currency})</span>}
            </label>
            {/* The field sits at the right edge, in line with the amounts above and below it */}
            <div className="w-28 shrink-0">
              <AmountInput id="request-total-gst" aria-label="Total GST" className="!h-8 !min-h-0 w-full rounded-lg !py-1 !pl-2 !pr-[5px] text-right text-sm tabular-nums" value={formatMoney(gst)} onValueChange={onGstChange} />
            </div>
          </div>
        ) : (
          <Row label={gstLabel} value={money(gst)} />
        ))}
      <Row label="Total" value={money(total)} strong />
    </div>
  )
}
