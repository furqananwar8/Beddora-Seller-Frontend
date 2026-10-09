import React from 'react'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import type { ContainerStatus, EtdAlert, PaymentState, PoDestination, PoPayment, PoStatus, PurchaseInvoicePdfStatus, PurchaseInvoiceStatus } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'

/** Display numbers mirror the backend's: `PO-1042` is row 42. */
export const formatPoNo = (id: number): string => `PO-${1000 + id}`

/** Payment Requests narrowed to one PO. */
export const poPaymentRequestsHref = (id: number): string => `/dashboard/finance/payment-request?purchaseOrderId=${id}`

export const DESTINATION_LABEL: Record<PoDestination, string> = { US: 'USA', CA: 'CANADA' }

export const PO_STATUS_META: Record<PoStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'DRAFT', tone: 'neutral' },
  PENDING_APPROVAL: { label: 'PENDING FOR APPROVAL', tone: 'warning' },
  IN_PROGRESS: { label: 'IN PROGRESS', tone: 'info' },
  READY_TO_SHIP: { label: 'READY TO SHIP', tone: 'success' },
}

export const PAYMENT_META: Record<PaymentState, { label: string; tone: StatusTone }> = {
  UNPAID: { label: 'UNPAID', tone: 'danger' },
  PARTIALLY_PAID: { label: 'PARTIALLY PAID', tone: 'warning' },
  PAID: { label: 'PAID', tone: 'success' },
}

export const PoStatusBadge: React.FC<{ status: PoStatus }> = ({ status }) => <StatusBadge label={PO_STATUS_META[status].label} tone={PO_STATUS_META[status].tone} />

export const PaymentBadge: React.FC<{ payment: PoPayment; withPercent?: boolean }> = ({ payment, withPercent }) => (
  <span className="inline-flex flex-col items-center gap-0.5">
    <StatusBadge label={PAYMENT_META[payment.status].label} tone={PAYMENT_META[payment.status].tone} />
    {withPercent && payment.status === 'PARTIALLY_PAID' && (
      <span className="text-xs text-text-muted">{payment.paidPercent >= 100 ? 'Paid in full · awaiting confirmation' : `${payment.paidPercent}% paid`}</span>
    )}
  </span>
)

export const OpenBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) => <StatusBadge label={isOpen ? 'OPEN' : 'CLOSED'} tone={isOpen ? 'info' : 'neutral'} />

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "5 days left · daily email", "Overdue 4 days · emailed daily", or "No alerts" once closed or shipped. */
export function etdCaption({ level, daysLeft, shipped }: EtdAlert): string {
  if (shipped) return 'Shipped · no alerts'
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

export const formatPlNo = (id: number): string => `PL#${5000 + id}`

/** A packaging list's suppliers (one per PO, a list may span several), for display. */
export const supplierNames = (suppliers: ReadonlyArray<{ name: string }>): string => suppliers.map((supplier) => supplier.name).join(', ') || '—'

/** Packaging lists narrowed to one PO. */
export const poPackagingListsHref = (id: number): string => `/dashboard/procurement/packaging-lists?purchaseOrderId=${id}`

/** New packaging list starting from one PO (its supplier and the PO preselected). */
export const newPackagingListHref = (purchaseOrderId?: number): string =>
  `/dashboard/procurement/packaging-lists/new${purchaseOrderId ? `?purchaseOrderId=${purchaseOrderId}` : ''}`

/** A PO can be packed once approved and while open. */
/** Approved POs: they can be packed, paid and shipped. Mirrors the server's rule. */
export const isApprovedPo = (po: { status: PoStatus }): boolean => po.status === 'IN_PROGRESS' || po.status === 'READY_TO_SHIP'

export const isPackable = (po: { status: PoStatus; isOpen: boolean }): boolean => isApprovedPo(po) && po.isOpen

/** In lifecycle order: a container only moves forward through these. */
export const CONTAINER_STATUS_META: Record<ContainerStatus, { label: string; tone: StatusTone }> = {
  BOOKED: { label: 'BOOKED', tone: 'neutral' },
  IN_TRANSIT: { label: 'IN TRANSIT', tone: 'info' },
  DELIVERED: { label: 'DELIVERED', tone: 'success' },
}

export const CONTAINER_STATUSES = Object.keys(CONTAINER_STATUS_META) as ContainerStatus[]

/** The statuses a container can move to from `current` (itself and later ones). */
export const nextContainerStatuses = (current: ContainerStatus): ContainerStatus[] => CONTAINER_STATUSES.slice(CONTAINER_STATUSES.indexOf(current))

/** How a container is called on screen: its shipping-line number when known, else our CID reference. */
export const containerLabel = (container: { containerNo: string; containerNumber: string | null }): string => container.containerNumber ?? container.containerNo

export const ContainerStatusBadge: React.FC<{ status: ContainerStatus }> = ({ status }) => <StatusBadge label={CONTAINER_STATUS_META[status].label} tone={CONTAINER_STATUS_META[status].tone} />

/** Status labels are UPPERCASE across Procurement and Finance; these match the payment request / payment process ones. */
export const PURCHASE_INVOICE_STATUS_META: Record<PurchaseInvoiceStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'DRAFT', tone: 'neutral' },
  PENDING_APPROVAL: { label: 'PENDING FOR APPROVAL', tone: 'warning' },
  REJECTED: { label: 'REJECTED', tone: 'danger' },
  PAYMENT_PENDING: { label: 'PAYMENT PENDING', tone: 'info' },
  PARTIALLY_PAID: { label: 'PARTIALLY PAID', tone: 'warning' },
  PAID: { label: 'PAID', tone: 'success' },
}

export const PURCHASE_INVOICE_STATUSES = Object.keys(PURCHASE_INVOICE_STATUS_META) as PurchaseInvoiceStatus[]

export const PurchaseInvoiceStatusBadge: React.FC<{ status: PurchaseInvoiceStatus }> = ({ status }) => (
  <StatusBadge label={PURCHASE_INVOICE_STATUS_META[status].label} tone={PURCHASE_INVOICE_STATUS_META[status].tone} />
)

export const PDF_STATUS_META: Record<PurchaseInvoicePdfStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'GENERATING', tone: 'neutral' },
  READY: { label: 'READY', tone: 'success' },
  FAILED: { label: 'FAILED', tone: 'danger' },
}

export const PURCHASE_INVOICES_URL = '/dashboard/procurement/purchase-invoices'

/** New purchase invoice prefilled from one PO. */
export const newPurchaseInvoiceHref = (purchaseOrderId: number): string => `${PURCHASE_INVOICES_URL}/new?purchaseOrderId=${purchaseOrderId}`

/** Purchase invoices narrowed to one PO. */
export const poPurchaseInvoicesHref = (purchaseOrderId: number): string => `${PURCHASE_INVOICES_URL}?purchaseOrderId=${purchaseOrderId}`
