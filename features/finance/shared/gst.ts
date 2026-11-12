import type { GstType } from '@/services/api/finance.api'
import { round2 } from './money'

export const GST_TYPE_OPTIONS: Array<{ value: GstType; label: string }> = [
  { value: 'INCLUSIVE', label: 'Inclusive' },
  { value: 'EXCLUSIVE', label: 'Exclusive' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
]

/** One amount as entered, with the GST % picked for it (null when none applies or none is picked yet). */
export interface GstInput {
  amount: number
  rate: number | null
}

export interface GstSplit {
  /** Before GST: what cost analysis uses. */
  net: number
  gst: number
  /** What is paid. */
  total: number
}

/**
 * The amounts entered split into what is before GST and the GST on it, line by line, each at its own rate and worked
 * out exactly as the server does (the server stays the source of truth):
 *  - exclusive: the GST is added on top, so the line pays amount + GST;
 *  - inclusive: the amount holds its GST, so the line's amount is that divided by (1 + rate), and that is what it pays;
 *  - not applicable: no GST.
 */
export function splitGst(entered: GstInput[], type: GstType): GstSplit {
  let net = 0
  let gst = 0
  let total = 0
  for (const { amount: value, rate } of entered) {
    const factor = (rate ?? 0) / 100
    if (type === 'INCLUSIVE' && factor > 0) {
      const amount = round2(value / (1 + factor))
      net += amount
      gst += round2(value - amount)
      total += amount
    } else if (type === 'EXCLUSIVE' && factor > 0) {
      const lineGst = round2(value * factor)
      net += round2(value)
      gst += lineGst
      total += round2(round2(value) + lineGst)
    } else {
      net += round2(value)
      total += round2(value)
    }
  }
  return { net: round2(net), gst: round2(gst), total: round2(total) }
}
