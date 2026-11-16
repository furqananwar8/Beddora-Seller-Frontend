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
  /** The GST typed in for this amount instead of the percentage's; null/undefined = worked out from the percentage. */
  gstAmount?: number | null
}

export interface GstSplit {
  /** Before GST: what cost analysis uses. */
  net: number
  gst: number
  /** What is paid. */
  total: number
  lines: Array<{ net: number; gst: number; total: number }>
}

/**
 * The amounts entered split into what is before GST and the GST on it, line by line, each at its own rate (or the GST
 * typed in for it) and worked out exactly as the server does (the server stays the source of truth):
 *  - exclusive: the GST is added on top, so the line pays amount + GST;
 *  - inclusive: the amount holds its GST, so the line's amount is that less the GST, and that is what it pays;
 *  - not applicable: no GST.
 */
export function splitGst(entered: GstInput[], type: GstType): GstSplit {
  const lines = entered.map(({ amount: value, rate, gstAmount }) => {
    const applies = type !== 'NOT_APPLICABLE'
    const typed = applies && gstAmount != null ? round2(gstAmount) : null
    const factor = (rate ?? 0) / 100
    if (type === 'INCLUSIVE' && (typed !== null || factor > 0)) {
      const net = typed !== null ? round2(Math.max(value - typed, 0)) : round2(value / (1 + factor))
      return { net, gst: round2(value - net), total: net }
    }
    if (type === 'EXCLUSIVE' && (typed !== null || factor > 0)) {
      const gst = typed ?? round2(value * factor)
      return { net: round2(value), gst, total: round2(round2(value) + gst) }
    }
    return { net: round2(value), gst: 0, total: round2(value) }
  })
  const sum = (pick: (line: GstSplit['lines'][number]) => number) => round2(lines.reduce((total, line) => total + pick(line), 0))
  return { net: sum((line) => line.net), gst: sum((line) => line.gst), total: sum((line) => line.total), lines }
}

/**
 * Spreads a total GST typed in over the amounts, in proportion to the GST each now has (or to its amount when none has),
 * the cent remainder going to the last one. Each is capped at its amount when inclusive. Returns one GST per amount.
 */
export function distributeGst(target: number, entered: GstInput[], type: GstType): number[] {
  if (entered.length === 0) return []
  const current = splitGst(entered, type).lines.map((line) => line.gst)
  const weights = current.some((gst) => gst > 0) ? current : entered.map((line) => line.amount)
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const wanted = round2(target)
  const shares = weights.map((weight) => (weightSum > 0 ? round2((wanted * weight) / weightSum) : round2(wanted / entered.length)))
  shares[shares.length - 1] = round2(shares[shares.length - 1] + wanted - shares.reduce((sum, share) => sum + share, 0))
  return shares.map((share, index) => (type === 'INCLUSIVE' ? Math.min(share, entered[index].amount) : share)).map((share) => Math.max(share, 0))
}
