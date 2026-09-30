'use client'

import React, { useState } from 'react'
import type { FinanceDocument } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { StoredDocumentPreview } from './StoredDocumentPreview'

const kind = (doc: FinanceDocument) => doc.originalName.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'

interface DocumentChipsProps {
  documents: FinanceDocument[]
  /** Names of files chosen but not saved yet (shown as dashed, non-clickable chips). */
  pendingNames?: string[]
  /** Renders a remove control on each chip (edit mode). */
  onRemove?: (doc: FinanceDocument) => void
  removingId?: string | null
  /** Text when nothing is attached; pass null to render nothing. */
  emptyText?: string | null
  className?: string
}

/** Attachment chips: clicking previews the stored file (fetched with the auth token) with Download and Close. */
export const DocumentChips: React.FC<DocumentChipsProps> = ({
  documents,
  pendingNames = [],
  onRemove,
  removingId,
  emptyText = 'No documents attached',
  className,
}) => {
  const [previewing, setPreviewing] = useState<FinanceDocument | null>(null)

  if (documents.length === 0 && pendingNames.length === 0) {
    return emptyText ? <span className="text-sm text-text-muted">{emptyText}</span> : null
  }

  return (
    <>
      <ul className={cn('flex flex-wrap gap-2', className)}>
        {documents.map((doc) => (
          <li key={doc.id} className="flex max-w-full items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
            <button
              type="button"
              title={`Preview ${doc.originalName}`}
              onClick={(event) => {
                event.stopPropagation()
                setPreviewing(doc)
              }}
              className="flex min-w-0 items-center gap-2 hover:underline"
            >
              <span className="rounded bg-danger-600 px-1.5 py-0.5 text-[10px] font-bold text-text-inverse">{kind(doc)}</span>
              <span className="max-w-[180px] truncate text-text-primary">{doc.originalName}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${doc.originalName}`}
                disabled={removingId === doc.id}
                onClick={() => onRemove(doc)}
                className="ml-1 text-text-subtle hover:text-text-primary disabled:opacity-50"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {pendingNames.map((name) => (
          <li key={name} className="flex max-w-full items-center rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-text-muted">
            <span className="max-w-[200px] truncate">{name}</span>
          </li>
        ))}
      </ul>
      <StoredDocumentPreview doc={previewing} onClose={() => setPreviewing(null)} />
    </>
  )
}
