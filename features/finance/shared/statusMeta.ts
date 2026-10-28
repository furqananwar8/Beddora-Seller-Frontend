import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { DocStatus, RequestStatus } from '@/services/api/finance.api'

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'DRAFT', tone: 'neutral' },
  PENDING_APPROVAL: { label: 'PENDING FOR APPROVAL', tone: 'warning' },
  APPROVED: { label: 'APPROVED', tone: 'success' },
  REJECTED: { label: 'REJECTED', tone: 'danger' },
}

export const DOC_STATUS_META: Record<DocStatus, { label: string; tone: StatusTone }> = {
  PAYMENT_PENDING: { label: 'PAYMENT PENDING', tone: 'info' },
  PARTIALLY_PAID: { label: 'PARTIALLY PAID', tone: 'warning' },
  POP_UPLOADED: { label: 'PAYMENT RECORDED', tone: 'success' },
  PAID: { label: 'PAID', tone: 'neutral' },
  AMOUNT_SETTLED: { label: 'AMOUNT SETTLED', tone: 'neutral' },
  CANCELLED: { label: 'CANCELLED', tone: 'danger' },
}

/** Closed by finance: paid in full, or settled with a balance outstanding. Nothing more is paid on it. */
export const isClosedDoc = (status: DocStatus): boolean => status === 'PAID' || status === 'AMOUNT_SETTLED'

/** Nothing more happens to it: paid, settled or cancelled. */
export const isFinalDoc = (status: DocStatus): boolean => isClosedDoc(status) || status === 'CANCELLED'
