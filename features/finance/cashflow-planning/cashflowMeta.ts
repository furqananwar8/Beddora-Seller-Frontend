import type { CashflowPaymentState } from '@/services/api/finance.api'

/** How a cell is coloured, and what the legend under the grid says about it. */
export const PAYMENT_STATE_META: Record<CashflowPaymentState, { label: string; cell: string; swatch: string; explainer: string }> = {
  PAID: {
    label: 'Paid',
    cell: 'bg-success-200 text-success-900',
    swatch: 'bg-success-200 border-success-300',
    explainer: 'Paid in full: the request’s whole amount is paid (or finance marked it paid or settled). A total is green when every request in it is paid in full.',
  },
  PARTLY_PAID: {
    label: 'Partly paid',
    cell: 'bg-orange-300 text-orange-900',
    swatch: 'bg-orange-300 border-orange-400',
    explainer: 'Totals only: some of the requests summed in the cell are paid in full and the others still owe money.',
  },
  UNPAID: {
    label: 'Unpaid',
    cell: 'bg-danger-200 text-danger-900',
    swatch: 'bg-danger-200 border-danger-300',
    explainer: 'Money is still owed: nothing has been paid yet, or only part of it. A total is red when none of its requests is paid in full.',
  },
}

/** Legend order: from settled to outstanding. */
export const PAYMENT_STATES: CashflowPaymentState[] = ['PAID', 'PARTLY_PAID', 'UNPAID']
