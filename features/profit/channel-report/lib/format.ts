import { formatNumber, formatPercentage } from '@/utils/format'

/** Text shown for a cost the channel does not report. */
export const NOT_REPORTED = 'n/a'

/** Money as a plain 2-decimal amount (the header shows the currency); `null` (not reported) becomes "n/a". */
export const formatMoney = (amount: number | null | undefined) =>
  amount === null || amount === undefined ? NOT_REPORTED : formatNumber(amount, 2)

export const formatMargin = (value: number | null) => (value === null ? NOT_REPORTED : formatPercentage(value, 1))

/** Tailwind class for a signed amount: costs red, profit green, zero neutral. */
export const amountTone = (amount: number | null | undefined) =>
  amount === null || amount === undefined
    ? 'text-text-muted italic'
    : amount < 0
      ? 'text-danger-700'
      : amount > 0
        ? 'text-success-700'
        : 'text-text-primary'
