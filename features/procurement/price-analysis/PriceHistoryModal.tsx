'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetPriceAnalysisQuery, useGetPriceAnalysisRevisionsQuery, type PriceAnalysisEvent, type PriceAnalysisRevision } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { ApprovalEventLine } from './ApprovalHistory'
import { sampleLabel } from './priceAnalysisForm'

const TYPE_LABEL: Record<PriceAnalysisRevision['type'], { label: string; tone: 'success' | 'info' | 'danger' }> = {
  CREATED: { label: 'CREATED', tone: 'success' },
  UPDATED: { label: 'UPDATED', tone: 'info' },
  REMOVED: { label: 'REMOVED', tone: 'danger' },
}

/** How a supplier's price moved against the previous snapshot: a new supplier, a price change, or no change. */
function changeOf(revision: PriceAnalysisRevision, previous: PriceAnalysisRevision | undefined, supplierId: number, price: number) {
  if (!previous) return null
  const before = previous.quotes.find((quote) => quote.supplierId === supplierId)
  if (!before) return { text: 'new', tone: 'text-sky-700' }
  if (before.unitPrice === price) return null
  const diff = price - before.unitPrice
  return { text: `${diff > 0 ? '+' : '-'}${formatCurrencyAmount(revision.currency, Math.abs(diff))} (was ${formatCurrencyAmount(previous.currency, before.unitPrice)})`, tone: diff > 0 ? 'text-danger-600' : 'text-success-700' }
}

const Revision: React.FC<{ revision: PriceAnalysisRevision; previous?: PriceAnalysisRevision }> = ({ revision, previous }) => {
  const meta = TYPE_LABEL[revision.type]
  const dropped = previous ? previous.quotes.filter((quote) => !revision.quotes.some((item) => item.supplierId === quote.supplierId)) : []
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge label={meta.label} tone={meta.tone} />
          <span className="text-sm font-medium text-text-primary">{formatDateTime(revision.at)}</span>
        </div>
        <span className="text-xs text-text-muted">by {revision.by.name ?? 'a teammate'}</span>
      </div>
      {revision.quotes.length > 0 && (
        <ul className="mt-2 divide-y divide-border/60 text-sm">
          {revision.quotes.map((quote) => {
            const change = changeOf(revision, previous, quote.supplierId, quote.unitPrice)
            return (
              <li key={quote.supplierId} className="flex flex-wrap items-baseline justify-between gap-2 py-1">
                <span className="min-w-0 break-words text-text-primary">
                  {quote.supplierName}
                  {quote.contactName && <span className="text-text-muted"> · {quote.contactName}</span>}
                  <span className="text-text-muted"> · Sample: {sampleLabel(quote.sample)}</span>
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold">{formatCurrencyAmount(revision.currency, quote.unitPrice)}</span>
                  {change && <span className={cn('ml-2 text-xs', change.tone)}>{change.text}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {dropped.length > 0 && <p className="mt-2 text-xs text-text-muted">Removed: {dropped.map((quote) => quote.supplierName).join(', ')}</p>}
      {revision.material && <p className="mt-1 text-xs text-text-muted">Material: {revision.material}</p>}
    </li>
  )
}

/** One entry of the timeline: a price snapshot or an approval decision. */
type TimelineEntry = { kind: 'revision'; at: string; revision: PriceAnalysisRevision; previous?: PriceAnalysisRevision } | { kind: 'approval'; at: string; event: PriceAnalysisEvent }

/** Snapshots and approval decisions in one list, newest first. */
function buildTimeline(revisions: PriceAnalysisRevision[], events: PriceAnalysisEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...revisions.map((revision, index): TimelineEntry => ({ kind: 'revision', at: revision.at, revision, previous: revisions[index + 1] })),
    ...events.map((event): TimelineEntry => ({ kind: 'approval', at: event.at, event })),
  ]
  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

/** The timeline of one product: every price change and every approval or rejection, newest first. */
export const PriceHistoryModal: React.FC<{ productId: number | null; productLabel: string; onClose: () => void }> = ({ productId, productLabel, onClose }) => {
  const skip = productId === null
  const revisions = useGetPriceAnalysisRevisionsQuery(productId ?? 0, { skip })
  const analysis = useGetPriceAnalysisQuery(productId ?? 0, { skip })
  const isLoading = revisions.isLoading || analysis.isLoading
  const isError = revisions.isError || analysis.isError
  const entries = buildTimeline(revisions.data ?? [], analysis.data?.history ?? [])
  return (
    <Modal isOpen={productId !== null} onClose={onClose} title={`Timeline · ${productLabel}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm font-medium text-danger-600">Could not load the timeline.</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Nothing recorded yet. Every save, approval and rejection from now on is kept here.</p>
      ) : (
        <ol className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          {entries.map((entry) =>
            entry.kind === 'revision' ? (
              <Revision key={`r${entry.revision.id}`} revision={entry.revision} previous={entry.previous} />
            ) : (
              <li key={`e${entry.event.id}`} className="flex gap-3 rounded-lg border border-border p-3">
                <ApprovalEventLine event={entry.event} productLabel={productLabel} />
              </li>
            )
          )}
        </ol>
      )}
    </Modal>
  )
}
