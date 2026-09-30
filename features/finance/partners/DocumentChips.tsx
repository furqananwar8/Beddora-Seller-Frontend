'use client'

import React from 'react'
import type { FinanceDocument } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { downloadFinanceDocument } from '../shared/downloadDocument'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

interface DocumentChipsProps {
  documents: FinanceDocument[]
  pendingNames?: string[]
  className?: string
}

/** Read-only list of attached documents; saved ones download on click. */
export const DocumentChips: React.FC<DocumentChipsProps> = ({ documents, pendingNames = [], className }) => {
  const { failure } = useFinanceFeedback()
  if (documents.length === 0 && pendingNames.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {documents.map((doc) => (
        <li key={doc.id}>
          <button
            type="button"
            title="Download"
            onClick={() => downloadFinanceDocument(doc.id, doc.originalName).catch((error) => failure(error, 'Could not download the file'))}
            className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm hover:bg-secondary-50"
          >
            <span className="max-w-[200px] truncate text-text-primary">{doc.originalName}</span>
          </button>
        </li>
      ))}
      {pendingNames.map((name) => (
        <li key={name} className="flex max-w-full items-center rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-text-muted">
          <span className="max-w-[200px] truncate">{name}</span>
        </li>
      ))}
    </ul>
  )
}
