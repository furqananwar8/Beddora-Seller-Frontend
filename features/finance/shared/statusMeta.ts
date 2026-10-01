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
  POP_UPLOADED: { label: 'POP UPLOADED', tone: 'success' },
  PAID: { label: 'PAID', tone: 'neutral' },
}
