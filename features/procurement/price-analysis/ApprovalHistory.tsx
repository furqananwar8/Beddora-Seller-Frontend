'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { PriceAnalysisEvent, PriceAnalysisStatus, PriceFamily, PriceFamilyEvent } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { cn } from '@/utils/cn'
import { variantLabel } from './priceAnalysisForm'

const EVENT_DOT: Record<PriceAnalysisEvent['type'], string> = { APPROVED: 'bg-success-600', STEP_APPROVED: 'bg-success-500', REJECTED: 'bg-danger-600', APPROVAL_CLEARED: 'bg-warning-500' }

const price = (event: PriceAnalysisEvent) => (event.unitPrice !== null && event.currency ? ` at ${formatCurrencyAmount(event.currency, event.unitPrice)}` : '')

/** "<variant>: <supplier (packaging)> approved by <who> on <date>"; each step of a chain, rejections with their reason, and approvals taken back. */
function describe(event: PriceAnalysisEvent, productLabel: string): string {
  const who = event.by.name ?? 'a teammate'
  const day = formatCalendarDay(event.at)
  const quote = event.supplierName ?? 'a supplier'
  if (event.type === 'APPROVED') return `${productLabel}: ${quote}${price(event)} was approved by ${who} on ${day}`
  if (event.type === 'STEP_APPROVED') return `${productLabel}: ${quote}${price(event)} was approved by ${who} on ${day}; the next step is still to approve`
  if (event.type === 'REJECTED') return `${productLabel}: ${quote}${price(event)} was rejected by ${who} on ${day}`
  return `${productLabel}: edited by ${who} on ${day}; the approval of ${quote}${price(event)} was taken back and needs approving again`
}

/** One approval, rejection or taken-back approval, worded for a timeline. */
export const ApprovalEventLine: React.FC<{ event: PriceAnalysisEvent; productLabel: string }> = ({ event, productLabel }) => (
  <>
    <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', EVENT_DOT[event.type])} aria-hidden />
    <div className="min-w-0">
      <p className="text-sm text-text-primary">{describe(event, productLabel)}</p>
      {event.remarks && <p className="text-xs text-text-muted">{event.type === 'REJECTED' ? 'Reason' : 'Remarks'}: {event.remarks}</p>}
    </div>
  </>
)

/** The approval history of a whole family: every variant's approvals and rejections in one timeline, newest first. */
export const ApprovalHistory: React.FC<{ events: PriceFamilyEvent[] }> = ({ events }) =>
  events.length === 0 ? (
    <p className="py-4 text-center text-sm text-text-muted">No approvals or rejections yet.</p>
  ) : (
    <ol className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <ApprovalEventLine event={event} productLabel={`${variantLabel(event.variant)} (${event.variant.ref})`} />
        </li>
      ))}
    </ol>
  )

const STATUS: Record<PriceAnalysisStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  APPROVED: { label: 'APPROVED', tone: 'success' },
  PENDING: { label: 'AWAITING APPROVAL', tone: 'warning' },
  NONE: { label: 'NO QUOTES', tone: 'neutral' },
}

/** One line per variant: where it stands and, once approved, which supplier and packaging at what price, by whom and when. */
export const ApprovalOverview: React.FC<{ family: PriceFamily; currentId: number; onPickVariant: (variantId: number) => void }> = ({ family, currentId, onPickVariant }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          <th className="py-2 pr-3">Variant</th>
          <th className="py-2 pr-3">Status</th>
          <th className="py-2 pr-3">Approved supplier &amp; packaging</th>
          <th className="py-2 pr-3 text-right">Price</th>
          <th className="py-2 pr-3">Approved by</th>
          <th className="py-2">On</th>
        </tr>
      </thead>
      <tbody>
        {family.variants.map((variant) => {
          const approved = variant.approved
          return (
            <tr key={variant.id} className={cn('border-b border-border/60 last:border-0', variant.id === currentId && 'bg-secondary-100')}>
              <td className="py-2 pr-3">
                <button type="button" onClick={() => (variant.id === currentId ? undefined : onPickVariant(variant.id))} className="text-left font-medium text-text-primary hover:underline">
                  {variantLabel(variant)}
                </button>
                <span className="ml-2 font-mono text-[11px] text-text-muted">{variant.ref}</span>
              </td>
              <td className="py-2 pr-3">
                <StatusBadge label={STATUS[variant.status].label} tone={STATUS[variant.status].tone} />
              </td>
              <td className="py-2 pr-3">{approved ? `${approved.supplierName}${approved.packagingOption ? ` (${approved.packagingOption})` : ''}` : <span className="text-text-muted">—</span>}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{approved?.unitPrice != null ? formatCurrencyAmount(approved.currency, approved.unitPrice) : <span className="text-text-muted">—</span>}</td>
              <td className="py-2 pr-3">{approved?.by?.name ?? <span className="text-text-muted">—</span>}</td>
              <td className="py-2">{approved?.at ? formatCalendarDay(approved.at) : <span className="text-text-muted">—</span>}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)
