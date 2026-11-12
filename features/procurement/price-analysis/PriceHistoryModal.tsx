'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetPriceAnalysisRevisionsQuery, type PriceAnalysisRevision } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

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

/** The price history of one product: a dated snapshot for every change, newest first, with how each price moved. */
export const PriceHistoryModal: React.FC<{ productId: number | null; productLabel: string; onClose: () => void }> = ({ productId, productLabel, onClose }) => {
  const { data, isLoading, isError } = useGetPriceAnalysisRevisionsQuery(productId ?? 0, { skip: productId === null })
  return (
    <Modal isOpen={productId !== null} onClose={onClose} title={`Price history · ${productLabel}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm font-medium text-danger-600">Could not load the price history.</p>
      ) : !data || data.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No price changes recorded yet. Every save from now on is kept here.</p>
      ) : (
        <ol className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          {data.map((revision, index) => (
            <Revision key={revision.id} revision={revision} previous={data[index + 1]} />
          ))}
        </ol>
      )}
    </Modal>
  )
}
