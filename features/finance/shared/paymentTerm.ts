import { addDays, format, isValid, parseISO } from 'date-fns'

/** Days after the invoice date a partner expects payment. Keep in step with the backend's finance/common/payment-term.ts. */
export const PAYMENT_TERM_DAYS = [15, 30, 45, 60, 90, 120] as const

export type PaymentTermDays = (typeof PAYMENT_TERM_DAYS)[number]

export const paymentTermLabel = (days: number | null | undefined): string => (days ? `${days} days` : 'No payment term')

export const PAYMENT_TERM_OPTIONS = PAYMENT_TERM_DAYS.map((days) => ({ value: String(days), label: paymentTermLabel(days) }))

/** The due date (yyyy-MM-dd) of an invoice dated `invoiceDate` (yyyy-MM-dd) under a term; empty without both. */
export function dueDateFor(invoiceDate: string, termDays: number | null | undefined): string {
  const date = parseISO(invoiceDate)
  return termDays && isValid(date) ? format(addDays(date, termDays), 'yyyy-MM-dd') : ''
}
