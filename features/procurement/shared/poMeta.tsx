import React from 'react'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import type { EtdAlert, PaymentState, PoDestination, PoPayment, PoStatus } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'

/** Display numbers mirror the backend's: `PO-1042` is row 42. */
export const formatPoNo = (id: number): string => `PO-${1000 + id}`

export const DESTINATION_LABEL: Record<PoDestination, string> = { US: 'USA', CA: 'CANADA' }

export const PO_STATUS_META: Record<PoStatus, { label: string; tone: StatusTone }> = {
  PENDING_APPROVAL: { label: 'Pending approval', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  READY_TO_SHIP: { label: 'Ready to ship', tone: 'success' },
}

export const PAYMENT_META: Record<PaymentState, { label: string; tone: StatusTone }> = {
  UNPAID: { label: 'Unpaid', tone: 'danger' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
}

export const PoStatusBadge: React.FC<{ status: PoStatus }> = ({ status }) => <StatusBadge label={PO_STATUS_META[status].label} tone={PO_STATUS_META[status].tone} />

export const PaymentBadge: React.FC<{ payment: PoPayment; withPercent?: boolean }> = ({ payment, withPercent }) => (
  <span className="inline-flex flex-col items-center gap-0.5">
    <StatusBadge label={PAYMENT_META[payment.status].label} tone={PAYMENT_META[payment.status].tone} />
    {withPercent && payment.status === 'PARTIALLY_PAID' && <span className="text-xs text-text-muted">{payment.paidPercent}% paid</span>}
  </span>
)

export const OpenBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) => <StatusBadge label={isOpen ? 'Open' : 'Closed'} tone={isOpen ? 'info' : 'neutral'} />

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "5 days left · daily email", "Overdue 4 days · emailed daily", or "No alerts" once closed or shipped. */
export function etdCaption({ level, daysLeft }: EtdAlert): string {
  if (level === 'NONE') return 'No alerts'
  if (level === 'OVERDUE') return `Overdue ${plural(Math.abs(daysLeft), 'day')} · daily email`
  if (level === 'SOON') return daysLeft === 0 ? 'Due today · daily email' : `${plural(daysLeft, 'day')} left · daily email`
  return `${plural(daysLeft, 'day')} left`
}

const ETD_PILL: Record<EtdAlert['level'], string> = {
  OVERDUE: 'bg-danger-600 text-white',
  SOON: 'border border-warning-500 bg-warning-50 text-warning-700',
  OK: 'border border-success-500 bg-success-50 text-success-700',
  NONE: 'bg-secondary-100 text-secondary-700',
}

/** ETD date coloured by how close it is: green > 10 days, orange ≤ 10, orange-red overdue, grey when no longer tracked. */
export const EtdBadge: React.FC<{ etd: string; alert: EtdAlert; withCaption?: boolean }> = ({ etd, alert, withCaption = true }) => (
  <span className="inline-flex flex-col items-center gap-0.5">
    <span className={cn('whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', ETD_PILL[alert.level])}>{formatCalendarDay(etd)}</span>
    {withCaption && <span className={cn('whitespace-nowrap text-xs', alert.level === 'OVERDUE' ? 'font-medium text-danger-600' : 'text-text-muted')}>{etdCaption(alert)}</span>}
  </span>
)
