import type { StatusTone } from '@/components/status-badge/StatusBadge'

/** How much of a request has been paid, independent of where it is in the approval workflow. */
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export const PAYMENT_STATE_META: Record<PaymentState, { label: string; tone: StatusTone }> = {
  UNPAID: { label: 'UNPAID', tone: 'neutral' },
  PARTIALLY_PAID: { label: 'PARTIALLY PAID', tone: 'warning' },
  FULLY_PAID: { label: 'FULLY PAID', tone: 'success' },
}

/** Unpaid is the default: nothing recorded yet, or no payment document at all. */
export function paymentStateOf(paidAmount: number | null | undefined, total: number): PaymentState {
  const paid = paidAmount ?? 0
  if (paid <= 0) return 'UNPAID'
  return paid >= total ? 'FULLY_PAID' : 'PARTIALLY_PAID'
}
