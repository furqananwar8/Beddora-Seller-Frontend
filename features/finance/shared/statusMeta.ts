import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { DocStatus, RequestStatus } from '@/services/api/finance.api'

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_APPROVAL: { label: 'Pending for Approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
}

export const DOC_STATUS_META: Record<DocStatus, { label: string; tone: StatusTone }> = {
  PAYMENT_PENDING: { label: 'Payment Pending', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partially Paid', tone: 'warning' },
  POP_UPLOADED: { label: 'POP uploaded', tone: 'success' },
  PAID: { label: 'Paid', tone: 'neutral' },
}
