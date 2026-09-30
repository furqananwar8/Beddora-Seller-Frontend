'use client'

import React from 'react'
import type { FinanceDocument } from '@/services/api/finance.api'
import { downloadFinanceDocument } from '../shared/downloadDocument'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

const kind = (doc: FinanceDocument) => doc.originalName.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'

interface DocumentChipsProps {
  documents: FinanceDocument[]
  /** Renders a remove control on each chip (edit mode). */
  onRemove?: (doc: FinanceDocument) => void
  removingId?: string | null
}

/** Attachment chips that download through the authenticated endpoint. */
export const DocumentChips: React.FC<DocumentChipsProps> = ({ documents, onRemove, removingId }) => {
  const { failure } = useFinanceFeedback()

  if (documents.length === 0) return <span className="text-sm text-text-muted">No documents attached</span>

  return (
    <ul className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="flex max-w-full items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
          <button
            type="button"
            title={`Download ${doc.originalName}`}
            onClick={(event) => {
              event.stopPropagation()
              downloadFinanceDocument(doc.id, doc.originalName).catch((error) => failure(error, 'Could not download the file'))
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
    </ul>
  )
}
