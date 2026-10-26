import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { DocStatus } from '@/services/api/finance.api'

/** How much of a request has been paid, independent of where it is in the approval workflow. */
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'SETTLED'

export const PAYMENT_STATE_META: Record<PaymentState, { label: string; tone: StatusTone }> = {
  UNPAID: { label: 'UNPAID', tone: 'neutral' },
  PARTIALLY_PAID: { label: 'PARTIALLY PAID', tone: 'warning' },
  FULLY_PAID: { label: 'FULLY PAID', tone: 'success' },
  SETTLED: { label: 'SETTLED', tone: 'neutral' },
}

/** Unpaid is the default: nothing recorded yet, or no payment document at all. Settled with a balance reads SETTLED. */
export function paymentStateOf(paidAmount: number | null | undefined, total: number, docStatus?: DocStatus | null): PaymentState {
  if (docStatus === 'AMOUNT_SETTLED') return 'SETTLED'
  const paid = paidAmount ?? 0
  if (paid <= 0) return 'UNPAID'
  return paid >= total ? 'FULLY_PAID' : 'PARTIALLY_PAID'
}
