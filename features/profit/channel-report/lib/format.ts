import { formatNumber, formatPercentage } from '@/utils/format'

/** Text shown for a cost the channel does not report. */
export const NOT_REPORTED = 'n/a'

const currencyFormats = new Map<string, Intl.NumberFormat>()

/** The bare symbol ("$1,234.50", never "CA$" or "US$"): the currency picker already says which currency it is. */
const formatWithSymbol = (amount: number, currency: string) => {
  let format = currencyFormats.get(currency)
  if (!format) currencyFormats.set(currency, (format = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })))
  return format.format(amount)
}

/** Money with the currency symbol; `null` (not reported) becomes "n/a". Without a currency: a plain 2-decimal amount. */
export const formatMoney = (amount: number | null | undefined, currency?: string) =>
  amount === null || amount === undefined ? NOT_REPORTED : currency ? formatWithSymbol(amount, currency) : formatNumber(amount, 2)

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
